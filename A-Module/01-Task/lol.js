/**
 * @NAPIVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/log", "N/search", "N/file", "N/record", "N/runtime", "N/sftp"], function (log, search, file, record, runtime, sftp) {
    var exports = {};
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reduce = exports.map = exports.getInputData = void 0;
    var parseTextToCSV = function (text) {
        var lines = text.split("\n");
        var result = [];
        var headers = [];
        for (var i = 0; i < lines.length; i++) {
            var values = lines[i].split("|");
            if (values.join('').trim() === '') {
                continue;
            }
            if (values[0] === 'Record Type') {
                headers = values;
            }
            else {
                var entry = {};
                for (var j = 0; j < headers.length && j < values.length; j++) {
                    entry[headers[j]] = values[j];
                }
                if (entry['Record Type'] === 'RCPT' || entry['Record Type'] === 'INV' || entry['Record Type'] === 'RCPTDTL' || entry['Record Type'] === 'INVWST') {
                    result.push(entry);
                }
            }
        }
        return result;
    };

    function calcMyVariance(currentData, inventory_c, locationInfo, stockunit) {
        try {
            var onHandFile = parseFloat(currentData["On hand Quantity"]);

            inventory_c.selectNewLine({
                sublistId: "inventory",
            });
            var columns = [];
            columns.push('internalid');
            columns.push('displayname');

            // columns.push('baserecordtype');

            var myItemSearch = search.create({ type: 'item', columns: columns });
            myItemSearch.filters = [
                search.createFilter({
                    name: 'custitem_4tech_numerosym',
                    operator: search.Operator.IS,
                    values: currentData["IM Inventory Item Number"]
                }),
            ];

            var idArticulo = [];

            // log.audit("ean", eanItem[i])
            var resultItem = myItemSearch.run();
            var firstItem = resultItem.getRange({ start: 0, end: 1000 });
            // log.audit("primer articulo", firstItem[0])
            // log.audit("segundo articulo", firstItem)

            if (firstItem[0] == undefined) {
                log.audit("ERROR: El codigo de Inventario no es valido en Netsuite: ", currentData["IM Inventory Item Number"]);
                return;
            }

            // log.audit("type: ", firstItem[0].recordType);

            var myItemRecord = record.load({ type: firstItem[0].recordType, id: firstItem[0].id, idDynamic: true });

            var name;
            var stockunit = myItemRecord.getValue({ fieldId: "baseunit" });
            var convunit = myItemRecord.getValue({ fieldId: "stockunit" });
            var convunitName = myItemRecord.getText({ fieldId: "stockunit" });

            if (firstItem.length > 0) {
                idArticulo.push(firstItem[0].id);
                name = firstItem[0].getValue({ name: "displayname" });
            }
            log.audit(name);
            if (name == idArticulo[0]) return;

            // log.audit("Inventory", idArticulo[0]);

            inventory_c.setCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "item",
                value: idArticulo[0],
            });

            inventory_c.setCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "rate",
                value: currentData["Adjusted Unit Price of Receipt Detail"],
            });

            inventory_c.setCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "class",
                value: runtime.getCurrentScript().getParameter({ name: 'custscript_clase_class' }),
            });

            inventory_c.setCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "department",
                value: runtime.getCurrentScript().getParameter({ name: 'custscript_centro_cost' }),
            });

            inventory_c.setCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "location",
                value: locationInfo[0],
            });

            inventory_c.setCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "units",
                value: stockunit,
            });


            var currentValueOfLine = inventory_c.getCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "unitcost",
            })

            if (parseFloat(currentValueOfLine) == 0) {
                inventory_c.setCurrentSublistValue({
                    sublistId: "inventory",
                    fieldId: "unitcost",
                    value: parseFloat(currentData["On hand Value"] / currentData["On hand Quantity"])
                })
            }

            var currentOnHand = inventory_c.getCurrentSublistValue({ sublistId: "inventory", fieldId: "quantityonhand" });
            if (onHandFile < 0) {
                log.audit("ERROR: ", "Inventario negativo en columna Quantity, Numero de item: " + currentData["IM Inventory Item Number"]);
                return;
            }

            // log.audit("Convunit: ", convunit);
            // log.audit("ConvunitName: ", convunitName);

            var rateConversion = 1;
            if (convunit != stockunit) {
                var rateConversionSearch = search.create({
                    type: "unitstype",
                    filters: [search.createFilter({
                        name: 'unitname',
                        operator: search.Operator.IS,
                        values: convunitName
                    })],
                    columns: ['conversionrate', 'unitname']
                });
                var resultItem = rateConversionSearch.run();
                var firstItem2 = resultItem.getRange({ start: 0, end: 1000 });
                //    log.audit("Result item: ", firstItem2);
                var rateConversion = firstItem2[0].getValue({ name: "conversionrate" })
            }


            var difference = -(currentOnHand - onHandFile);
            log.audit("Diferencia entre archivo y Netsuite: ", difference);
            if (difference == 0) {
                log.audit("NOVEDAD: la diferencia es de 0 no se realizara Ajuste: ", "Numero Item " + currentData["IM Inventory Item Number"]);
                return;
            }
            //log.audit("Adjustment 1: ", inventory_c.getCurrentSublistValue({
            //    sublistId: "inventory",
            //     fieldId: "adjustqtyby",
            // }))

            // log.audit("Diff: ", difference);

            inventory_c.setCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "adjustqtyby",
                value: difference,
            });

            inventory_c.setCurrentSublistValue({
                sublistId: "inventory",
                fieldId: "memo",
                value: "Ajuste hecho de la columna On Hand Quantity",
            });

            if (difference > 0) {
                if (firstItem[0].recordType == "inventoryitem" || firstItem[0].recordType == "assemblyitem") {

                    log.audit("Adjustment: ", inventory_c.getCurrentSublistValue({
                        sublistId: "inventory",
                        fieldId: "adjustqtyby",
                    }));

                    //Inventory detail
                    var inventoryDetailSubrecord = inventory_c.getCurrentSublistSubrecord({
                        sublistId: "inventory",
                        fieldId: "inventorydetail",
                    });

                    inventoryDetailSubrecord.selectNewLine({
                        sublistId: "inventoryassignment",
                    });

                    // inventoryDetailSubrecord.setCurrentSublistValue({
                    //     sublistId: "inventoryassignment",
                    //     fieldId: "receiptinventorynumber",
                    //     value: "XX0001",
                    //     ignoreFieldChange: false,
                    // });

                    ///inventoryDetailSubrecord.setCurrentSublistValue({
                    //    sublistId: "inventoryassignment",
                    //    fieldId: "inventorystatus",
                    //    value: 1,
                    //    ignoreFieldChange: true,
                    // });

                    //inventoryDetailSubrecord.setCurrentSublistValue({
                    //    sublistId: "inventoryassignment",
                    //    fieldId: "expirationdate",
                    //    value: new Date("11/03/2024"),
                    //    ignoreFieldChange: true,
                    //});
                    inventory_c.commitLine({
                        sublistId: "inventory",
                    });

                    return idArticulo[0];
                    inventoryDetailSubrecord.setCurrentSublistValue({
                        sublistId: "inventoryassignment",
                        fieldId: "quantity",
                        value: difference,
                        ignoreFieldChange: true,
                    });

                    log.audit("Adjustment: ", inventory_c.getCurrentSublistValue({
                        sublistId: "inventory",
                        fieldId: "adjustqtyby",
                    }));

                    inventory_c.commitLine({
                        sublistId: "inventory",
                    });
                    return idArticulo[0];
                }
                //log.audit("Adjustment: ", inventory_c.getCurrentSublistValue({
                //    sublistId: "inventory",
                //    fieldId: "adjustqtyby",
                // }));

                //Inventory detail
                var inventoryDetailSubrecord = inventory_c.getCurrentSublistSubrecord({
                    sublistId: "inventory",
                    fieldId: "inventorydetail",
                });

                inventoryDetailSubrecord.selectNewLine({
                    sublistId: "inventoryassignment",
                });

                inventoryDetailSubrecord.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "receiptinventorynumber",
                    value: "XX0001",
                    ignoreFieldChange: false,
                });

                inventoryDetailSubrecord.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "inventorystatus",
                    value: 1,
                    ignoreFieldChange: true,
                });

                inventoryDetailSubrecord.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "expirationdate",
                    value: new Date("11/12/2024"),
                    ignoreFieldChange: true,
                });

                inventoryDetailSubrecord.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "quantity",
                    value: difference,
                    ignoreFieldChange: true,
                });

                inventoryDetailSubrecord.commitLine({
                    sublistId: "inventoryassignment"
                });

                // log.audit("Adjustment: ", inventory_c.getCurrentSublistValue({
                //    sublistId: "inventory",
                //    fieldId: "adjustqtyby",
                //}));

                inventory_c.commitLine({
                    sublistId: "inventory",
                });
                return idArticulo[0];

            } else if (difference < 0) {
                if (firstItem[0].recordType == "inventoryitem" || firstItem[0].recordType == "assemblyitem") {

                    var currentOnHand = inventory_c.getCurrentSublistValue({ sublistId: "inventory", fieldId: "quantityonhand" });

                    //  log.audit("Current on hand!: ", currentOnHand);


                    if (currentOnHand == 0) {
                        log.audit("ERROR: ", "La cantidad en lote es 0 para el item de id " + idArticulo[0]);
                        return;
                    }

                    inventory_c.setCurrentSublistValue({
                        sublistId: "inventory",
                        fieldId: "adjustqtyby",
                        value: difference,
                    });
                    var inventoryDetailSubrecord = inventory_c.getCurrentSublistSubrecord({
                        sublistId: "inventory",
                        fieldId: "inventorydetail",
                    });

                    inventoryDetailSubrecord.selectNewLine({
                        sublistId: "inventoryassignment",
                    });
                    inventory_c.commitLine({
                        sublistId: "inventory",
                    });

                    return idArticulo[0];
                    //Inventory detail
                    var inventoryDetailSubrecord = inventory_c.getCurrentSublistSubrecord({
                        sublistId: "inventory",
                        fieldId: "inventorydetail",
                    });

                    inventoryDetailSubrecord.selectNewLine({
                        sublistId: "inventoryassignment",
                    });

                    inventoryDetailSubrecord.setCurrentSublistValue({
                        sublistId: "inventoryassignment",
                        fieldId: "receiptinventorynumber",
                        value: difference,
                        ignoreFieldChange: false,
                    });

                    inventory_c.commitLine({
                        sublistId: "inventory",
                    });

                    return idArticulo[0];
                }

                var currentOnHand = inventory_c.getCurrentSublistValue({ sublistId: "inventory", fieldId: "quantityonhand" });
                if (currentOnHand == 0) {
                    log.error("ERROR: ", "La cantidad en lote es 0 para el item de id " + idArticulo[0]);
                    return;
                }
                //
                var inventorySearch = search.load({ id: 'customsearch_busqueda_balance', type: 'inventorybalance' });
                inventorySearch.filters = [
                    search.createFilter({
                        name: 'custitem_4tech_numerosym',
                        join: 'item',
                        operator: 'is',
                        values: currentData["IM Inventory Item Number"]
                    }),
                    search.createFilter({
                        name: 'location',
                        operator: 'is',
                        values: locationInfo[0],
                    }),
                    search.createFilter({
                        name: 'status',
                        operator: 'is',
                        values: 1
                    }),
                ];
                var inventorySearchRun = inventorySearch.run();
                var start = 0;
                var lotes = [];

                var onHandQuantity = difference;
                if (parseFloat(currentOnHand).toFixed(2) == 0) {
                    return;
                }

                if (Math.abs(parseFloat(difference) > parseFloat(currentOnHand))) {
                    log.error("ERROR: ", "No hay suficiente en el lote del item " + idArticulo[0] + " para retirar la siguiente cantidad: " + difference + ", se retiro: " + currentOnHand);
                    inventory_c.setCurrentSublistValue({
                        sublistId: "inventory",
                        fieldId: "memo",
                        value: "Alerta: La cantidad consumida en inventory es mayor a la existencia de Nesuite,  se ajustó la cantidad disponible"
                    });
                    onHandQuantity = 0 - currentOnHand;
                }


                var valueToDelete = parseFloat(parseFloat(onHandQuantity));
                // log.audit("Value To Delete: ", valueToDelete);
                inventory_c.setCurrentSublistValue({
                    sublistId: "inventory",
                    fieldId: "adjustqtyby",
                    value: valueToDelete,
                });
                var totalValue = 0;
                do {
                    var inventorySearchRange = inventorySearchRun.getRange(start, start + 1000);
                    // log.audit("inventory search range", inventorySearchRange);
                    for (var x = 0; x < inventorySearchRange.length; x++) {
                        try {
                            //     log.audit("Information: ", inventorySearchRange[x]);
                            // var currentValue = inventorySearchRange[x].getValue({ name: "onhand" });
                            var lote = inventorySearchRange[x].getValue({ name: "inventorynumber" });
                            var currentValue = inventorySearchRange[x].getValue({ name: "available" });
                            //    log.audit("current value: ", parseFloat(currentValue));
                            if (currentValue == 0) continue;
                            if (parseFloat(currentValue) >= Math.abs(valueToDelete)) {
                                lotes.push({ lot: lote, value: parseFloat((valueToDelete)) });
                                totalValue += -Math.abs(parseFloat(valueToDelete));
                                valueToDelete = 0; // No more value to delete
                                //          log.audit("Lotes: ", lotes);
                                break;
                            } else {
                                lotes.push({ lot: lote, value: -parseFloat(currentValue) });
                                valueToDelete += parseFloat(currentValue);
                                totalValue += -Math.abs(parseFloat(currentValue));
                            }
                        } catch (error) {
                            log.error('Error Schedule', error);
                        }
                    }
                    start += 1000;
                } while (inventorySearchRange && inventorySearchRange.length == 1000)
                // log.audit("Total Value: ", totalValue);
                if (totalValue == 0 || lotes.length < 1) {
                    log.error("ERROR: ", "El articulo no tenia ninguna cantidad real, numero de aritculo: " + currentData["IM Inventory Item Number"]);
                    return;
                }
                if (totalValue != currentValue) {
                    log.audit("NOVEDAD: El valor de on hand es diferente al real, se cambiara para hacer el ajuste");
                    inventory_c.setCurrentSublistValue({
                        sublistId: "inventory",
                        fieldId: "adjustqtyby",
                        value: totalValue,
                    });
                }
                // log.audit("Lotes: ", lotes);
                // if (idArticulo == 3326) break;
                if (valueToDelete != 0) {
                    // log.audit("Valores faltantes: ", valueToDelete);
                    // log.audit("Valores a borrar: ", difference);
                    // log.audit("No hay suficiente valores en lotes")
                }

                var inventoryDetailSubrecord = inventory_c.getCurrentSublistSubrecord({
                    sublistId: "inventory",
                    fieldId: "inventorydetail",
                });

                for (i = 0; i < lotes.length; i++) {
                    inventoryDetailSubrecord.selectNewLine({
                        sublistId: "inventoryassignment",
                    });

                    inventoryDetailSubrecord.setCurrentSublistValue({
                        sublistId: "inventoryassignment",
                        fieldId: "issueinventorynumber",
                        value: lotes[i].lot,
                        ignoreFieldChange: false,
                    });

                    inventoryDetailSubrecord.setCurrentSublistValue({
                        sublistId: "inventoryassignment",
                        fieldId: "quantity",
                        value: lotes[i].value,
                        ignoreFieldChange: true,
                    });

                    inventoryDetailSubrecord.commitLine({
                        sublistId: "inventoryassignment"
                    });
                }

                inventory_c.commitLine({
                    sublistId: "inventory",
                });

                return idArticulo[0];
            }
        } catch (e) {
            log.audit("ERROR, en la fase de los ajustes: ", e);
        }
    }

    var getInputData = function (_) {
        try {
            var folderId = 543;
            var objConnection = sftp.createConnection({
                //establish connection to the FTP server
                username: "SFTP_CVS",
                url: "mtu5-ohra-sftp.oracleindustry.com",
                hostKey:
                    "AAAAB3NzaC1yc2EAAAADAQABAAABAQC19V8Dlyf36wdhgEg2Fmpq/9m5STw8R6Jc6rwtMC4gIa/p2n2TKbPjhlKUlBhL/ZHH1LZYwO+rPFVNj7hyym+PvCqtOoaMTK50yU34GbYQf9zJt8qR1sc3WMwauQ+9/mleuYMiDxXiD73Lu3MTVY7dm6e10yQdLo540P1k9KEkZG95z/RgDWtJsLV1Eg9oLYs6iZUpVxEseuApgVU2I9R7TiTkn1lKqs4zGaucqB6MWRXYwdjL/tDCCtbC3rw5Pmich8l9duaumvrVjycDobfuBCGYFDt9N/bX3dfPCgIHK1sMlX9PKiHkOgToSwFN0ZoUU/2q7UNxfM9DY0yXs8l3",
                directory: "/u01/sftp/SFTP_CVS/Exports Inv/",
                passwordGuid: "417ee69cf5db4f6382b0481633798947",
                port: 22,
            });

            var files = objConnection.list({
                path: "",
            });
            const currentDate = new Date();

            const yesterday = new Date(currentDate);
            yesterday.setDate(currentDate.getDate());

            const filesFromYesterday = files.filter(file => {
                const fileLastModified = new Date(file.lastModified);
                return (
                    !file.directory // &&  // Exclude directories
                    // fileLastModified.getDate() === yesterday.getDate() &&
                    // fileLastModified.getMonth() === yesterday.getMonth() &&
                    // fileLastModified.getFullYear() === yesterday.getFullYear()
                );
            });
            // og.audit("Files from yesterday: ", filesFromYesterday);
            let downloadedFiles = [];
            // log.audit("Files: ", filesFromYesterday);

            //filesFromYesterday.forEach(file => {
            //    const { name } = file;
            //    log.audit("Descargando Archivo: ", name);

            //  const downloadedFile = objConnection.download({ filename: name });

            //     downloadedFiles.push(downloadedFile);
            // });
            const maxFiles = 50;
            let filesProcessed = 0;

            for (const file of filesFromYesterday) {
                if (filesProcessed >= maxFiles) {
                    break;
                }

                const { name } = file;
                log.audit("Descargando Archivo: ", name);

                var downloadedFile = objConnection.download({ filename: name });
                downloadedFiles.push({ name: name, content: downloadedFile.getContents() });

                filesProcessed++;
            }

            // log.audit(downloadedFiles);

            // var netFiles = search.create({
            //    type: 'folder',
            //    filters: [
            //        ['internalid', 'is', folderId], 'AND',
            //        ['file.folder', 'is', folderId]
            //    ],
            //    columns: [
            //        search.createColumn({
            //            name: 'internalid',
            //            join: 'file'
            //        })
            //    ]
            //}).run().getRange({
            //    start: 0,
            //    end: 1000
            //});

            return downloadedFiles;
        } catch (e) {
            log.audit("Error in getinput: ", e);
        }
    };
    exports.getInputData = getInputData;
    var map = function (context) {
        try {
            // log.audit("Context: ", context);
            //log.audit("Value: ", context.value);

            // var file_1 = JSON.parse(context);
            var data = JSON.parse(context.value);
            context.write({
                key: data.name,
                //    // key: context,
                value: data.content,
            });
            // log.audit("Netfiles: ", context);
        }
        catch (e) {
            log.error("Error in map phase: ", e);
        }
    };
    exports.map = map;
    function createInventory(fecha, account, locationInfo, memo) {
        var inventory_a = record.create({
            type: record.Type.INVENTORY_ADJUSTMENT,
            isDynamic: true,
        });

        const regex = /_(\d{4}-\d{2}-\d{2})\.txt/;

        const match = fecha.match(regex);
        var fecha = 0;
        if (match) {
            const dateString = match[1];
            log.audit("Fecha:", dateString);
            fecha = dateString.replace(/-/g, '\/');
        } else {
            log.audit("Fecha no encontrada en el archivo.");
        }


        inventory_a.setValue({
            fieldId: "subsidiary",
            value: 2,
        });

        inventory_a.setValue({
            fieldId: "trandate",
            value: fecha == 0 ? new Date() : new Date(fecha),
        });

        inventory_a.setValue({
            fieldId: "account",
            value: account,
        });

        inventory_a.setValue({
            fieldId: "account",
            value: account,
        });

        inventory_a.setValue({
            fieldId: "memo",
            value: memo
        });

        inventory_a.setValue({
            fieldId: "adjlocation",
            value: locationInfo[0]
        });

        inventory_a.setValue({
            fieldId: "department",
            value: runtime.getCurrentScript().getParameter({ name: 'custscript_centro_cost' }),
        });

        return inventory_a;
    }
    var reduce = function (context) {
        try {
            var errorCount = 0;
            var objConnection = sftp.createConnection({
                //establish connection to the FTP server
                username: "SFTP_CVS",
                url: "mtu5-ohra-sftp.oracleindustry.com",
                hostKey:
                    "AAAAB3NzaC1yc2EAAAADAQABAAABAQC19V8Dlyf36wdhgEg2Fmpq/9m5STw8R6Jc6rwtMC4gIa/p2n2TKbPjhlKUlBhL/ZHH1LZYwO+rPFVNj7hyym+PvCqtOoaMTK50yU34GbYQf9zJt8qR1sc3WMwauQ+9/mleuYMiDxXiD73Lu3MTVY7dm6e10yQdLo540P1k9KEkZG95z/RgDWtJsLV1Eg9oLYs6iZUpVxEseuApgVU2I9R7TiTkn1lKqs4zGaucqB6MWRXYwdjL/tDCCtbC3rw5Pmich8l9duaumvrVjycDobfuBCGYFDt9N/bX3dfPCgIHK1sMlX9PKiHkOgToSwFN0ZoUU/2q7UNxfM9DY0yXs8l3",
                directory: "/u01/sftp/SFTP_CVS/Exports Inv/",
                passwordGuid: "417ee69cf5db4f6382b0481633798947",
                port: 22,
            });

            objConnection.move({
                from: `./${context.key}`,
                to: `./Procesado/${context.key}`,
            });

            //var fileObj = file.load({
            //   id: context.key
            //});
            //var fileObj = context.value;
            // var dataFle = fileObj.getContents();
            //var dataFle = fileObj;
            // log.audit("Reduce context: ", context.values);
            log.audit("Name: ", context.key);
            var dataFle = context.values[0];
            const rows = dataFle.split('\n');
            const header = rows[0].split('|');
            const storeNumberIndex = header.indexOf('Store Number');
            const storeNumber = rows[1].split('|')[storeNumberIndex];
            //const dateCreatedIndex = header.indexOf("Date Created")
            // const dateCreated = rows[0].split('|')[dateCreatedIndex];
            var itemsVariance = [];
            // log.audit("Store Number: ", storeNumber);

            var columns = [];
            columns.push('internalid');

            var myItemSearchLocation = search.create({ type: 'location', columns: columns });
            myItemSearchLocation.filters = [
                search.createFilter({
                    name: 'custrecord_ft_cvstr_codubisim',
                    operator: search.Operator.IS,
                    values: storeNumber
                }),
            ];
            // Receip to be accepted
            var locationInfo = [];
            // var searchForReceipt = search.load({
            //    id: "customsearch410",
            //    type: search.Type.PURCHASE_ORDER
            //});
            //var searchRun = searchForReceipt.run();
            var pageSize = 1000;
            var start = 0;
            var receipts = {};

            //do {
            //    var firstResult = searchRun.getRange({ start: start, end: start + pageSize });
            //    for (var x = 0; x < firstResult.length; x++) {
            //        try {
            //            receipts[firstResult[x].getValue({ name: "item" })] = firstResult[x].id;
            //        } catch (error) {
            //            log.audit('Error Schedule', error);
            //       }
            //   }
            //} while (firstResult && firstResult.length == 1000)


            // log.audit("ean", eanItem[i])
            var resultItem = myItemSearchLocation.run();
            var firstItem = resultItem.getRange({ start: 0, end: 1000 });
            // log.audit("primer articulo", firstItem[0])
            // log.audit("segundo articulo", firstItem)

            if (firstItem.length > 0) {
                locationInfo.push(firstItem[0].id);
            }
            log.audit("Ubicacion: ", locationInfo[0]);
            var result = parseTextToCSV(dataFle.replace(/\r/g, ''));
            var data = result;
            //data.sort((a, b) => {
            //    return b["Record Type"].localeCompare(a["Record Type"]);
            //});
            data.sort((a, b) => {
                const order = { 'RCPT': 1, 'INV': 2, 'INVWST': 3 };
                return order[a['Record Type']] - order[b['Record Type']];
            });
            var dataSize = data.length;

            if (dataSize == 0) {
                return;
            }
            var inventories = {};
            var inventoriesWaste = {};
            var inventoriesVariance = {};

            log.audit("data", data);
            log.audit("data size", data.length);
            var saved = false;
            var firstiter = true;
            for (var k = 0; k < 2; k++) {
                log.audit("AAA VAR: ", firstiter);
                for (let j = 0; j < data.length; j++) {
                    var currentData = data[j];
                    log.audit("record type", currentData["Record Type"])
                    if (currentData["Record Type"] == "" || currentData["Record Type"] == undefined) continue;
                    // if (currentData["Record Type"] != "RCPT" && currentData["Record Type"] != "INV") continue;
                    var myItemRecord = 0;
                    var account = 0;
                    if (currentData["Record Type"] == "INV" || currentData["Record Type"] == "INVWST") {
                        var myItemSearch = search.create({ type: 'item', columns: columns });
                        myItemSearch.filters = [
                            search.createFilter({
                                name: 'custitem_4tech_numerosym',
                                operator: search.Operator.IS,
                                values: currentData["IM Inventory Item Number"]
                            }),
                        ];

                        var idArticulo = [];

                        var resultItem = myItemSearch.run();
                        var firstItem = resultItem.getRange({ start: 0, end: 1000 });
                        // log.audit("primer articulo", firstItem[0])
                        // log.audit("segundo articulo", firstItem)

                        if (firstItem[0] == undefined) {
                            log.audit("ERROR: El codigo de Inventario no es valido en Netsuite", currentData["IM Inventory Item Number"]);
                            continue;
                        }
                        // log.audit("type: ", firstItem[0].recordType);

                        myItemRecord = record.load({ type: firstItem[0].recordType, id: firstItem[0].id, idDynamic: true });
                        account = myItemRecord.getValue({fieldId: "cogsaccount" });
                    } 

                    if (myItemRecord != 0) {
                        if (k == 0) {
                            if (!inventories[account]) {
                                inventories[account] = createInventory(context.key, account, locationInfo, "Integración Data Export Lineas Usage");
                            } 
                            if (!inventoriesWaste[account]) {
                                inventoriesWaste[account] = createInventory(context.key, account, locationInfo, "Integración Data Export Lineas Waste");
                            }                        
                        } else {
                            if (!inventoriesVariance[account]) {
                               // inventoriesVariance[account] = createInventory(context.key, account, locationInfo, "Integración Data Export Lineas Variance");                           
                            }
                        }
                    }
                    if (currentData["Record Type"] == "INVWST" && firstiter) {
                        log.audit("Current Data: ", currentData);
                        if (!saved) {
                            log.audit("INFO:", "Se guardo el primer ajuste de inventario iniciamos el waste");
                            log.audit("inventories: ", inventories);

                            for (const prop in inventories) {
                                if (inventories[prop].getLineCount("inventory") > 0) {
                                    inventories[prop].save({
                                        enableSourcing: true,
                                        ignoreMandatoryFields: true,
                                    });
    
                                }
                              }
                            saved = true;
                        }
                        //continue;
                        inventoriesWaste[account].selectNewLine({
                            sublistId: "inventory",
                        });

                        var columns = [];
                        columns.push('internalid');
                        columns.push('displayname');


                        var myItemSearch = search.create({ type: 'item', columns: columns });
                        myItemSearch.filters = [
                            search.createFilter({
                                name: 'custitem_4tech_numerosym',
                                operator: search.Operator.IS,
                                values: currentData["IM Inventory Item Number"]
                            }),
                        ];

                        var idArticulo = [];

                        var resultItem = myItemSearch.run();
                        var firstItem = resultItem.getRange({ start: 0, end: 1000 });
                        // log.audit("primer articulo", firstItem[0])
                        // log.audit("segundo articulo", firstItem)

                        if (firstItem[0] == undefined) {
                            log.audit("ERROR: El codigo de Inventario no es valido en Netsuite", currentData["IM Inventory Item Number"]);
                            continue;
                        }
                        // log.audit("type: ", firstItem[0].recordType);

                        var myItemRecord = record.load({ type: firstItem[0].recordType, id: firstItem[0].id, idDynamic: true });

                        var name;
                        var stockunit = myItemRecord.getValue({ fieldId: "baseunit" });
                        if (firstItem.length > 0) {
                            idArticulo.push(firstItem[0].id);
                            name = firstItem[0].getValue({ name: "displayname" });
                        }
                        log.audit(name);
                        if (name == idArticulo[0]) continue;

                        log.audit("ID del Articulo: ", idArticulo[0]);

                        inventoriesWaste[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "item",
                            value: idArticulo[0],
                        });


                        inventoriesWaste[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "rate",
                            value: currentData["Adjusted Unit Price of Receipt Detail"],
                        });

                        inventoriesWaste[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "class",
                            value: runtime.getCurrentScript().getParameter({ name: 'custscript_clase_class' }),
                        });

                        inventoriesWaste[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "department",
                            value: runtime.getCurrentScript().getParameter({ name: 'custscript_centro_cost' }),
                        });

                        inventoriesWaste[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "location",
                            value: locationInfo[0],
                        });

                        inventoriesWaste[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "units",
                            value: stockunit,
                        });

                        inventoriesWaste[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "memo",
                            value: "Ajuste hecho por la linea de Waste",
                        });

                        if (parseInt(currentData["Quantity"]) > 0) {
                            continue;
                        } else if (parseFloat(currentData["Quantity"]) < 0) {
                            var currentOnHand = inventoriesWaste[account].getCurrentSublistValue({ sublistId: "inventory", fieldId: "quantityonhand" });

                            // log.audit("Current on hand!: ", currentOnHand);


                            if (currentOnHand == 0) {
                                log.error("ERROR: ", "La cantidad en lote es 0 en el item: " + idArticulo[0]);
                                errorCount += 1;
                                continue;
                            }

                            if (firstItem[0].recordType == "inventoryitem" || firstItem[0].recordType == "assemblyitem") {
                                inventoriesWaste[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "location",
                                    value: locationInfo[0],
                                });

                                inventoriesWaste[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "units",
                                    value: stockunit,
                                });

                                var currentOnHand = inventoriesWaste[account].getCurrentSublistValue({ sublistId: "inventory", fieldId: "quantityonhand" });

                                // log.audit("Current on hand!: ", currentOnHand);


                                if (currentOnHand == 0) {
                                    log.error("ERROR: ", "La cantidad en lote es 0 para el item de id " + idArticulo[0]);
                                    errorCount += 1;
                                    continue;
                                }

                                if (Math.abs(parseFloat(currentData["Quantity"])) > parseFloat(currentOnHand)) {
                                    inventoriesWaste[account].setCurrentSublistValue({
                                        sublistId: "inventory",
                                        fieldId: "memo",
                                        value: "Alerta: La cantidad consumida en inventory es mayor a la existencia de Nesuite,  se ajustó la cantidad disponible"
                                    });
                                    currentData["Quantity"] = 0 - parseFloat(currentOnHand);
                                }


                                inventoriesWaste[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "adjustqtyby",
                                    value: currentData["Quantity"],
                                });

                                var inventoryDetailSubrecord = inventoriesWaste[account].getCurrentSublistSubrecord({
                                    sublistId: "inventory",
                                    fieldId: "inventorydetail",
                                });


                                inventoryDetailSubrecord.selectNewLine({
                                    sublistId: "inventoryassignment",
                                });


                                inventoriesWaste[account].commitLine({
                                    sublistId: "inventory",
                                });
                                continue;

                                inventoriesWaste[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "adjustqtyby",
                                    value: currentData["Quantity"],
                                });

                                //Inventory detail
                                var inventoryDetailSubrecord = inventoriesWaste[account].getCurrentSublistSubrecord({
                                    sublistId: "inventory",
                                    fieldId: "inventorydetail",
                                });
                                inventoryDetailSubrecord.selectNewLine({
                                    sublistId: "inventoryassignment",
                                });

                                inventoriesWaste[account].commitLine({
                                    sublistId: "inventory",
                                });

                                continue;
                            }

                            inventoriesWaste[account].setCurrentSublistValue({
                                sublistId: "inventory",
                                fieldId: "location",
                                value: locationInfo[0],
                            });
                            inventoriesWaste[account].setCurrentSublistValue({
                                sublistId: "inventory",
                                fieldId: "units",
                                value: stockunit,
                            });

                            var currentOnHand = inventoriesWaste[account].getCurrentSublistValue({ sublistId: "inventory", fieldId: "quantityonhand" });
                            if (currentOnHand == 0) {
                                log.error("Error: ", "La cantidad en lote es 0 para el item de id " + idArticulo[0]);
                                errorCount += 1;
                                continue;
                            }
                            //
                            var inventorySearch = search.load({ id: 'customsearch_busqueda_balance', type: 'inventorybalance' });
                            inventorySearch.filters = [
                                search.createFilter({
                                    name: 'custitem_4tech_numerosym',
                                    join: 'item',
                                    operator: 'is',
                                    values: currentData["IM Inventory Item Number"]
                                }),
                                search.createFilter({
                                    name: 'location',
                                    operator: 'is',
                                    values: locationInfo[0],
                                }),
                                search.createFilter({
                                    name: 'status',
                                    operator: 'is',
                                    values: 1
                                }),
                            ];
                            var inventorySearchRun = inventorySearch.run();
                            var start = 0;
                            var lotes = [];

                            var onHandQuantity = currentData["Quantity"];
                            if (parseFloat(currentOnHand).toFixed(2) == 0) {
                                continue;
                            }

                            if (Math.abs(parseFloat(currentData["Quantity"])) > parseFloat(currentOnHand)) {
                                log.error("ERROR: ", "No hay suficiente en el lote para retirar la siguiente cantidad: " + currentData["Quantity"] + ", se retiro: " + currentOnHand);
                                inventoriesWaste[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "memo",
                                    value: "Alerta: La cantidad consumida en inventory es mayor a la existencia de Nesuite,  se ajustó la cantidad disponible"
                                });
                                onHandQuantity = 0 - currentOnHand;
                                errorCount += 1;
                            }

                            inventoriesWaste[account].setCurrentSublistValue({
                                sublistId: "inventory",
                                fieldId: "adjustqtyby",
                                value: parseFloat(onHandQuantity),
                            });

                            var valueToDelete = parseFloat(parseFloat(onHandQuantity));
                            // log.audit("Value to delete", valueToDelete);
                            var totalValue = 0;
                            do {
                                var inventorySearchRange = inventorySearchRun.getRange(start, start + 1000);
                                // log.audit("inventory search range", inventorySearchRange);
                                for (var x = 0; x < inventorySearchRange.length; x++) {
                                    try {
                                        // log.audit("Information: ", inventorySearchRange[x]);
                                        var currentValue = inventorySearchRange[x].getValue({ name: "available" });
                                        var lote = inventorySearchRange[x].getValue({ name: "inventorynumber" });
                                        // log.audit("current value: ", parseFloat(currentValue));
                                        if (currentValue == 0) continue;
                                        if (parseFloat(currentValue) >= Math.abs(valueToDelete)) {
                                            lotes.push({ lot: lote, value: parseFloat((valueToDelete)) });
                                            totalValue += -Math.abs(parseFloat(valueToDelete));
                                            valueToDelete = 0; // No more value to delete
                                            break;
                                        } else {
                                            lotes.push({ lot: lote, value: -currentValue });
                                            valueToDelete += parseFloat(currentValue);
                                            totalValue += -Math.abs(parseFloat(currentValue));
                                        }
                                    } catch (error) {
                                        log.error('Error Schedule', error);
                                        errorCount += 1;
                                    }
                                }
                                start += 1000;
                            } while (inventorySearchRange && inventorySearchRange.length == 1000)
                            //     log.audit("Lotes: ", lotes);
                            //     log.audit("TotalValue: ", totalValue);

                            if (totalValue == 0 || lotes.length < 1) {
                                log.error("Error: ", "El articulo no tenia ninguna cantidad real, codigo: " + currentData["IM Inventory Item Number"]);
                                errorCount += 1;
                                continue;
                            }

                            if (totalValue != currentValue) {
                                log.audit("NOVEDAD: El valor de on hand es diferente al real, se cambiara para hacer el ajuste", "Codigo de articulo: " + currentData["IM Inventory Item Number"]);
                                inventoriesWaste[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "adjustqtyby",
                                    value: totalValue,
                                });
                            }
                            // if (idArticulo == 3326) break;
                            if (valueToDelete != 0) {
                                //   log.audit("Valores faltantes: ", valueToDelete);
                                //   log.audit("Valores a borrar: ", currentData["Quantity"]);
                                //   log.audit("No hay suficiente valores en lotes")
                            }

                            var inventoryDetailSubrecord = inventoriesWaste[account].getCurrentSublistSubrecord({
                                sublistId: "inventory",
                                fieldId: "inventorydetail",
                            });

                            for (i = 0; i < lotes.length; i++) {
                                inventoryDetailSubrecord.selectNewLine({
                                    sublistId: "inventoryassignment",
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "issueinventorynumber",
                                    value: lotes[i].lot,
                                    ignoreFieldChange: false,
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "quantity",
                                    value: lotes[i].value,
                                    ignoreFieldChange: true,
                                });

                                inventoryDetailSubrecord.commitLine({
                                    sublistId: "inventoryassignment"
                                });
                            }

                            inventoriesWaste[account].commitLine({
                                sublistId: "inventory",
                            });
                        }
                        continue;
                    }
                    if (currentData["Record Type"] == "INV") {
                        if (currentData["Counted Quantity"] != 0 && k == 1) {
                            log.audit("Counted Quantity", currentData);
                            log.audit("Name inv:", currentData["Inventory Item Name1"]);
                          //  calcMyVariance(currentData, inventoriesVariance[account], locationInfo, stockunit);
                        }

                        if (k == 1) {
                            continue;
                        }
                        //   log.audit("Called", currentData);
                        //      log.audit("Name inv:", currentData["Inventory Item Name1"]);
                        inventories[account].selectNewLine({
                            sublistId: "inventory",
                        });
                        var columns = [];
                        columns.push('internalid');
                        columns.push('displayname');

                        // columns.push('baserecordtype');

                        var myItemSearch = search.create({ type: 'item', columns: columns });
                        myItemSearch.filters = [
                            search.createFilter({
                                name: 'custitem_4tech_numerosym',
                                operator: search.Operator.IS,
                                values: currentData["IM Inventory Item Number"]
                            }),
                        ];

                        var idArticulo = [];

                        // log.audit("ean", eanItem[i])
                        var resultItem = myItemSearch.run();
                        var firstItem = resultItem.getRange({ start: 0, end: 1000 });
                        log.audit("primer articulo", firstItem[0])
                        log.audit("segundo articulo", firstItem)

                        if (firstItem[0] == undefined) {
                            log.error("ERROR: El codigo de Inventario no es valido en Netsuite", currentData["IM Inventory Item Number"]);
                            errorCount += 1;
                            continue;
                        }
                        log.audit("type: ", firstItem[0].recordType);

                        var myItemRecord = record.load({ type: firstItem[0].recordType, id: firstItem[0].id, idDynamic: true });

                        var name;
                        var stockunit = myItemRecord.getValue({ fieldId: "baseunit" });
                        var convunit = myItemRecord.getValue({ fieldId: "stockunit" });
                        var convunitName = myItemRecord.getText({ fieldId: "stockunit" });

                        if (firstItem.length > 0) {
                            idArticulo.push(firstItem[0].id);
                            name = firstItem[0].getValue({ name: "displayname" });
                        }
                        // log.audit(name);
                        if (name == idArticulo[0]) continue;
                        // log.audit("Inventory", idArticulo[0]);

                        inventories[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "item",
                            value: idArticulo[0],
                        });

                        inventories[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "rate",
                            value: currentData["Adjusted Unit Price of Receipt Detail"],
                        });

                        inventories[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "class",
                            value: runtime.getCurrentScript().getParameter({ name: 'custscript_clase_class' }),
                        });

                        inventories[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "department",
                            value: runtime.getCurrentScript().getParameter({ name: 'custscript_centro_cost' }),
                        });

                        inventories[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "location",
                            value: locationInfo[0],
                        });

                        inventories[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "units",
                            value: stockunit,
                        });

                        inventories[account].setCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "memo",
                            value: "Ajuste hecho por columna Usage Quantity",
                        });

                        var currentValueOfLine = inventories[account].getCurrentSublistValue({
                            sublistId: "inventory",
                            fieldId: "unitcost",
                        })

                        if (parseFloat(currentValueOfLine) == 0) {
                            inventories[account].setCurrentSublistValue({
                                sublistId: "inventory",
                                fieldId: "unitcost",
                                value: parseFloat(currentData["On hand Value"] / currentData["On hand Quantity"])
                            })
                        }

                        if (parseInt(currentData["Usage Quantity"]) > 0) {
                            continue;
                        } else if (parseFloat(currentData["Usage Quantity"]) < 0) {
                            if (firstItem[0].recordType == "inventoryitem" || firstItem[0].recordType == "assemblyitem") {
                                inventories[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "location",
                                    value: locationInfo[0],
                                });

                                inventories[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "units",
                                    value: stockunit,
                                });

                                var currentOnHand = inventories[account].getCurrentSublistValue({ sublistId: "inventory", fieldId: "quantityonhand" });

                                // log.audit("Current on hand!: ", currentOnHand);
                                //  log.audit("Usage Quantity!: ", currentData["Usage Quantity"]);



                                if (currentOnHand == 0) {
                                    log.error("Error: ", "La cantidad en lote es 0 para el item de id " + idArticulo[0]);
                                    errorCount += 1;
                                    continue;
                                }

                                if (Math.abs(parseFloat(currentData["Usage Quantity"])) > parseFloat(currentOnHand)) {
                                    inventories[account].setCurrentSublistValue({
                                        sublistId: "inventory",
                                        fieldId: "memo",
                                        value: "Alerta: La cantidad consumida en inventory es mayor a la existencia de Nesuite,  se ajustó la cantidad disponible"
                                    });
                                    currentData["Usage Quantity"] = 0 - parseFloat(currentOnHand);
                                }

                                inventories[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "adjustqtyby",
                                    value: currentData["Usage Quantity"],
                                });
                                // if (firstItem[0].id == 191) {
                                //     continue;
                                // }
                                var inventoryDetailSubrecord = inventories[account].getCurrentSublistSubrecord({
                                    sublistId: "inventory",
                                    fieldId: "inventorydetail",
                                });

                                inventoryDetailSubrecord.selectNewLine({
                                    sublistId: "inventoryassignment",
                                });

                                inventories[account].commitLine({
                                    sublistId: "inventory",
                                });
                                continue;
                                var inventoryDetailSubrecord = inventories[account].getCurrentSublistSubrecord({
                                    sublistId: "inventory",
                                    fieldId: "inventorydetail",
                                });
                                log.audit("data: ", inventoryDetailSubrecord.getLineCount({ sublistId: "inventory" }));
                                var inventoryDetailSubrecord = inventories[account].getCurrentSublistSubrecord({
                                    sublistId: "inventory",
                                    fieldId: "inventorydetail",
                                });

                                var inventoryDetailSubrecord = inventories[account].getCurrentSublistSubrecord({
                                    sublistId: "inventory",
                                    fieldId: "inventorydetail",
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "receiptinventorynumber",
                                    value: currentData["Usage Quantity"],
                                    ignoreFieldChange: false,
                                });
                                inventoryDetailSubrecord.selectNewLine({
                                    sublistId: "inventoryassignment",
                                });

                                //Inventory detail
                                var inventoryDetailSubrecord = inventories[account].getCurrentSublistSubrecord({
                                    sublistId: "inventory",
                                    fieldId: "inventorydetail",
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "receiptinventorynumber",
                                    value: currentData["Usage Quantity"],
                                    ignoreFieldChange: false,
                                });

                                inventories[account].commitLine({
                                    sublistId: "inventory",
                                });

                                continue;
                            }

                            inventories[account].setCurrentSublistValue({
                                sublistId: "inventory",
                                fieldId: "location",
                                value: locationInfo[0],
                            });
                            inventories[account].setCurrentSublistValue({
                                sublistId: "inventory",
                                fieldId: "units",
                                value: stockunit,
                            });

                            var currentOnHand = inventories[account].getCurrentSublistValue({ sublistId: "inventory", fieldId: "quantityonhand" });
                            if (currentOnHand == 0) {
                                log.error("ERROR: ", "La cantidad en lote es 0 para el item de id " + idArticulo[0]);
                                errorCount += 1;
                                continue;
                            }
                            //
                            var inventorySearch = search.load({ id: 'customsearch_busqueda_balance', type: 'inventorybalance' });
                            inventorySearch.filters = [
                                search.createFilter({
                                    name: 'custitem_4tech_numerosym',
                                    join: 'item',
                                    operator: 'is',
                                    values: currentData["IM Inventory Item Number"]
                                }),
                                search.createFilter({
                                    name: 'location',
                                    operator: 'is',
                                    values: locationInfo[0],
                                }),
                                search.createFilter({
                                    name: 'status',
                                    operator: 'is',
                                    values: 1
                                }),
                            ];
                            var inventorySearchRun = inventorySearch.run();
                            var start = 0;
                            var lotes = [];

                            var onHandQuantity = currentData["Usage Quantity"];
                            if (parseFloat(currentOnHand).toFixed(2) == 0) {
                                errorCount += 1;
                                continue;
                            }

                            //                        log.audit(currentOnHand);

                            if (Math.abs(parseFloat(currentData["Usage Quantity"])) > parseFloat(currentOnHand)) {
                                log.error("ERROR: ", "No hay suficiente en el lote para retirar la siguiente cantidad: " + currentData["Usage Quantity"] + ", se retiro: " + currentOnHand);
                                errorCount += 1;
                                inventories[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "memo",
                                    value: "Alerta: La cantidad consumida en inventory es mayor a la existencia de Nesuite,  se ajustó la cantidad disponible"
                                });
                                onHandQuantity = 0 - currentOnHand;
                            }


                            //  log.audit("Convunit: ", convunit);
                            //  log.audit("ConvunitName: ", convunitName);

                            var rateConversion = 1;
                            if (convunit != stockunit) {
                                var rateConversionSearch = search.create({
                                    type: "unitstype",
                                    filters: [search.createFilter({
                                        name: 'unitname',
                                        operator: search.Operator.IS,
                                        values: convunitName
                                    })],
                                    columns: ['conversionrate', 'unitname']
                                });
                                var resultItem = rateConversionSearch.run();
                                var firstItem2 = resultItem.getRange({ start: 0, end: 1000 });
                                //        log.audit("Result item: ", firstItem2);
                                var rateConversion = firstItem2[0].getValue({ name: "conversionrate" })
                            }

                            //    log.audit("Rate conversion: ", rateConversion);
                            var valueToDelete = parseFloat(onHandQuantity).toFixed(2) / rateConversion;
                            //    log.audit("Value to delete: ", valueToDelete);

                            inventories[account].setCurrentSublistValue({
                                sublistId: "inventory",
                                fieldId: "adjustqtyby",
                                value: parseFloat(onHandQuantity).toFixed(2) / rateConversion,
                            });

                            if (valueToDelete > parseFloat(currentOnHand)) {
                                log.error("ERROR: ", "No hay suficiente en el lote para retirar la siguiente cantidad: " + currentData["Usage Quantity"] + ", se retiro: " + currentOnHand);
                                inventories[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "memo",
                                    value: "Alerta: La cantidad consumida en inventory es mayor a la existencia de Nesuite,  se ajustó la cantidad disponible"
                                });
                                valueToDelete = 0 - currentOnHand;
                                errorCount += 1;
                            }
                            //    log.audit("Value to delete: ", valueToDelete);
                            var totalValue = 0;
                            do {
                                var inventorySearchRange = inventorySearchRun.getRange(start, start + 1000);
                                // log.audit("inventory search range", inventorySearchRange);
                                for (var x = 0; x < inventorySearchRange.length; x++) {
                                    try {
                                        // log.audit("Information: ", inventorySearchRange[x]);
                                        var currentValue = inventorySearchRange[x].getValue({ name: "available" });
                                        var lote = inventorySearchRange[x].getValue({ name: "inventorynumber" });
                                        // log.audit("current value: ", parseFloat(currentValue));
                                        if (currentValue == 0) continue;
                                        if (parseFloat(currentValue) >= Math.abs(valueToDelete)) {
                                            lotes.push({ lot: lote, value: parseFloat((valueToDelete)) });
                                            totalValue += -Math.abs(parseFloat(valueToDelete));
                                            valueToDelete = 0; // No more value to delete
                                            break;
                                        } else {
                                            lotes.push({ lot: lote, value: -parseFloat(currentValue) });
                                            valueToDelete += parseFloat(currentValue);
                                            totalValue += -Math.abs(parseFloat(currentValue));
                                        }
                                    } catch (error) {
                                        log.error('Error Schedule', error);
                                    }
                                }
                                start += 1000;
                            } while (inventorySearchRange && inventorySearchRange.length == 1000)
                            //      log.audit("Lotes: ", lotes);
                            //      // if (idArticulo == 3326) break;
                            //      log.audit("TotalValue: ", totalValue);
                            if (totalValue == 0 || lotes.length < 1) {
                                log.error("ERROR: ", "El articulo no tenia ninguna cantidad real");
                                errorCount += 1;
                                continue;
                            }

                            if (totalValue != currentValue) {
                                log.audit("NOVEDAD: El valor de on hand es diferente al real, se cambiara para hacer el ajuste", "Codigo de articulo: " + currentData["IM Inventory Item Number"]);
                                inventories[account].setCurrentSublistValue({
                                    sublistId: "inventory",
                                    fieldId: "adjustqtyby",
                                    value: totalValue,
                                });
                            }

                            if (valueToDelete != 0) {
                                //log.audit("Valores faltantes: ", valueToDelete);
                                // log.audit("Valores a borrar: ", currentData["Usage Quantity"]);
                                //  log.audit("No hay suficiente valores en lotes")
                            }

                            var inventoryDetailSubrecord = inventories[account].getCurrentSublistSubrecord({
                                sublistId: "inventory",
                                fieldId: "inventorydetail",
                            });

                            for (i = 0; i < lotes.length; i++) {
                                inventoryDetailSubrecord.selectNewLine({
                                    sublistId: "inventoryassignment",
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "issueinventorynumber",
                                    value: lotes[i].lot,
                                    ignoreFieldChange: false,
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "quantity",
                                    value: lotes[i].value,
                                    ignoreFieldChange: true,
                                });

                                inventoryDetailSubrecord.commitLine({
                                    sublistId: "inventoryassignment"
                                });
                            }

                            inventories[account].commitLine({
                                sublistId: "inventory",
                            });

                        }
                        // log.audit("AAA diference: ", currentData["Variance Quantity"]);
                    } else if (currentData["Record Type"] == "RCPT" && firstiter) {
                        // log.audit("Info: ", currentData);
                        //if (currentData["Vendor Name"] == "ERP NETSUITE") continue;
                        if (currentData["IM Purchase Order Number"] != "") continue;
                        if (currentData["Receipt Status"] != 6) {
                            //  log.audit("Result: ", receipts);
                            continue;
                            for (var m = 0; m < data.length; m++) {
                                var current_data = data[m];
                                //   log.audit("Current_data: ", current_data);
                                if (current_data["Record Type"] == "" || current_data["Record Type"] == undefined) continue;
                                if (current_data["Record Type"] == "RCPTDTL" && current_data["Receipt Number"] == currentData["Receipt Number"]) {
                                    var columns = [];
                                    columns.push('internalid');

                                    var myItemSearch = search.create({ type: 'item', columns: columns });
                                    myItemSearch.filters = [
                                        search.createFilter({
                                            name: 'internalid',
                                            operator: search.Operator.IS,
                                            values: current_data["IM Vendor Reference Number"]
                                        }),
                                        search.createFilter({
                                            name: 'location',
                                            operator: search.Operator.IS,
                                            values: locationInfo[0]
                                        }),
                                    ];

                                    var idArticulo = 0;


                                    var resultItem = myItemSearch.run();
                                    var firstItem = resultItem.getRange({ start: 0, end: 1000 });

                                    //   log.audit("type: ", current_data["IM Vendor Reference Number"]);
                                    var myItemRecord = record.load({ type: firstItem[0].recordType, id: firstItem[0].id, idDynamic: true });
                                    var stockunit = myItemRecord.getValue({ fieldId: "baseunit" });
                                    if (firstItem.length > 0) {
                                        idArticulo = firstItem[0].id;
                                    }

                                    if (receipts[idArticulo]) {
                                        // log.audit("Receipts: ", receipts[current_data["IM Vendor Reference Number"]])
                                        var receivedRecord = record.transform({
                                            fromType: record.Type.PURCHASE_ORDER,
                                            fromId: receipts[idArticulo],
                                            toType: "itemreceipt"
                                        });

                                        receivedRecord.setSublistValue({
                                            sublistId: 'item',
                                            line: 0,
                                            fieldId: 'location',
                                            value: locationInfo[0],
                                            ignoreFieldChange: true,
                                            forceSyncSourcing: true
                                        });

                                        receivedRecord.save();

                                        // log.audit("Info: ", "Received record");
                                    }
                                }
                            }
                            continue;
                        }
                        // if (currentData["Receipt Status"] == 5) continue;
                        if (currentData["Receipt Status"] != 5 && currentData["Receipt Status"] != 6) continue;


                        var bill_record = record.create({
                            type: record.Type.VENDOR_BILL,
                            isDynamic: true,
                        });

                        bill_record.setValue({
                            fieldId: "entity",
                            value: "12775"
                        });

                        bill_record.setValue({
                            fieldId: "memo",
                            value: "Compra extraordinaria"
                        });

                        const dateString = currentData["Invoice Date"];
                        const year = parseInt(dateString.substring(0, 4), 10);
                        const month = parseInt(dateString.substring(4, 6), 10) - 1; // Months are 0-based in JavaScript
                        const day = parseInt(dateString.substring(6, 8), 10);
                        const myDate = new Date(year, month, day);

                        bill_record.setValue({
                            fieldId: "trandate",
                            value: myDate,
                        });
                        const currentDate = new Date();

                        if (myDate.getMonth() !== currentDate.getMonth() && myDate.getFullYear !== currentDate.getFullYear) {
                            log.audit("INFO: ", "No se añadira, transacción en tiempo cerrado");
                            continue;
                        }

                        for (var m = 0; m < data.length; m++) {
                            var current_data = data[m];
                            if (current_data["Record Type"] == "RCPTDTL" && current_data["Receipt Number"] == currentData["Receipt Number"]) {
                                log.audit("Data: ", current_data);
                                log.audit("Item ID", current_data["IM Vendor Reference Number"]);

                                var columns = [];
                                columns.push('internalid');
                                // columns.push('baserecordtype');

                                var myItemSearch = search.create({ type: 'item', columns: columns });
                                myItemSearch.filters = [
                                    search.createFilter({
                                        name: 'internalid',
                                        operator: search.Operator.IS,
                                        values: current_data["IM Vendor Reference Number"]
                                    }),
                                ];

                                var idArticulo = 0;

                                // log.audit("ean", eanItem[i])
                                var resultItem = myItemSearch.run();
                                var firstItem = resultItem.getRange({ start: 0, end: 1000 });
                                // log.audit("primer articulo", firstItem[0])
                                // log.audit("segundo articulo", firstItem)
                                //  log.audit("type: ", current_data["IM Vendor Reference Number"]);
                                var myItemRecord = record.load({ type: firstItem[0].recordType, id: firstItem[0].id, idDynamic: true });
                                var stockunit = myItemRecord.getValue({ fieldId: "baseunit" });
                                if (firstItem.length > 0) {
                                    idArticulo = firstItem[0].id;
                                }

                                // log.audit("Id: ", current_data["IM Vendor Reference Number"]);

                                bill_record.selectNewLine({
                                    sublistId: "item",
                                });

                                bill_record.setCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "item",
                                    value: current_data["IM Vendor Reference Number"],
                                });

                                bill_record.setCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "quantity",
                                    value: current_data["Quantity"],
                                });

                                bill_record.setCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "units",
                                    value: stockunit,
                                });

                                bill_record.setCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "rate",
                                    value: current_data["Adjusted Unit Price of Receipt Detail"],
                                });

                                bill_record.setCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "class",
                                    value: runtime.getCurrentScript().getParameter({ name: 'custscript_clase_class' }),
                                });

                                bill_record.setCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "department",
                                    value: runtime.getCurrentScript().getParameter({ name: 'custscript_centro_cost' }),
                                });


                                if (firstItem[0].recordType == "inventoryitem" || firstItem[0].recordType == "assemblyitem") {
                                    bill_record.setCurrentSublistValue({
                                        sublistId: "item",
                                        fieldId: "location",
                                        value: locationInfo[0],
                                    });

                                    bill_record.setCurrentSublistValue({
                                        sublistId: "item",
                                        fieldId: "adjustqtyby",
                                        value: current_data["Quantity"],
                                    });

                                    bill_record.commitLine({
                                        sublistId: "item",
                                    });

                                    continue;
                                }
                                bill_record.setCurrentSublistValue({
                                    sublistId: "item",
                                    fieldId: "location",
                                    value: locationInfo[0],
                                });

                                //Inventory detail
                                var inventoryDetailSubrecord = bill_record.getCurrentSublistSubrecord({
                                    sublistId: "item",
                                    fieldId: "inventorydetail",
                                });

                                inventoryDetailSubrecord.selectNewLine({
                                    sublistId: "inventoryassignment",
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "receiptinventorynumber",
                                    value: "XX0001",
                                    ignoreFieldChange: false,
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "inventorystatus",
                                    value: 1,
                                    ignoreFieldChange: true,
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "expirationdate",
                                    value: new Date("11/16/2023"),
                                    ignoreFieldChange: true,
                                });

                                inventoryDetailSubrecord.setCurrentSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "quantity",
                                    value: current_data["Quantity"],
                                    ignoreFieldChange: true,
                                });

                                inventoryDetailSubrecord.commitLine({
                                    sublistId: "inventoryassignment"
                                });

                                bill_record.commitLine({
                                    sublistId: "item",
                                });
                            }
                        }
                        bill_record.setValue({ fieldId: "approvalstatus", value: 2 });
                        // bill_record.setValue({ fieldId: "nextapprover", value: "" });
                        bill_record.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true,
                        });
                        log.audit("Registro de venta guardado con el id: ", bill_record.id);

                        var paymentRecord = record.transform({
                            fromType: "vendorbill",
                            fromId: bill_record.id,
                            toType: "vendorpayment"
                        });

                        paymentRecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true,
                        });

                        log.audit("El record se le ha hecho payment, registrado con el id: ", paymentRecord.id);
                    }
                }
                if (k == 0) {
                    for (const prop in inventoriesWaste) {
                        if (inventoriesWaste[prop].getLineCount("inventory") > 0) {
                            inventoriesWaste[prop].save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true,
                            });

                        }
                    }
                }

                if (k == 1) {
                    log.audit("inventory variance: ", inventoriesVariance);
                    for (const prop in inventoriesVariance) {
                        log.audit(inventoriesVariance[prop]);
                        if (inventoriesVariance[prop].getLineCount("inventory") > 0) {
                            inventoriesVariance[prop].save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true,
                            });

                        }
                    }
                }
                log.audit("AAA ITER: ", k);

                if (errorCount > 0) {
                    log.audit("Numero de errores en diferentes lineas: ", errorCount);
                    log.audit("Se devolvera el archivo a la carpeta raiz: ", context.key);
                    objConnection.move({
                        from: `./Procesado/${context.key}`,
                        to: `./${context.key}`,
                    });
                }

            }

        }
        catch (e) {
            objConnection.move({
                from: `./Procesado/${context.key}`,
                to: `./${context.key}`,
            });
            log.error("Error in Reduce phase: ", e);
        }
    };
    exports.reduce = reduce;
    return exports;
});