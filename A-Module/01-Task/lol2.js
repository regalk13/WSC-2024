/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/runtime', 'N/record', 'N/search', 'N/file', 'N/format', 'N/email'], function (runtime, record, search, file, format, email) {
    // var TerceroArray = {};
    var arrConcep;
    var arrCamp = []
    var arrapliCuen;
    var arrcuenCamp;
    var arrCuentasFiltro;
    var carpetaAlmacenamieto = ''
    var NombreFormato = ''
    var fileObj = '';
    var xmlExcell = '';
    var count = 0;

    function getInputData() {
        try {

            //Busqueda de la configuracion inicialn
            var requestparam = runtime.getCurrentScript();
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })
            var filIdFormato = arrRecord.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_formid' })
            var NombreFormato = arrRecord.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_nomfor' })
            var arrCampTemp = arrRecord.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_arrcamp' })
            var anio = arrRecord.getValue({ fieldId: 'custrecord_ft_mm_rec_anio' })
            carpetaAlmacenamieto = arrRecord.getValue({ fieldId: 'custrecord_ft_mm_rec_caralm' })
            var arrCampSplit = JSON.parse(arrCampTemp)
            var busquedaGeneral = search.load({
                id: 'customsearch_ft_com_sear_premm',
                type: 'customrecord_ft_mm_regmes'
            })
            busquedaGeneral.filters.push(search.createFilter({
                name: 'custrecord_ft_mm_formatmes',
                operator: 'IS',
                values: filIdFormato
            }))
            busquedaGeneral.filters.push(search.createFilter({
                name: 'custrecord_ft_mm_anio',
                operator: 'IS',
                values: anio
            }))
            rowExcellCabecera(arrCampSplit.length, arrCampSplit, NombreFormato, carpetaAlmacenamieto)
            // log.audit('busquedaGeneral', busquedaGeneral)
            return busquedaGeneral;
        } catch (error) {
            log.audit('Error GetInput Data MR', error);
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })
            var emailMergeError = render.mergeEmail({
                templateId: 3,
            });

            email.send({
                author: -5,
                recipients: arrRecord.getValue({ fieldId: "custrecord_ft_mm_rec_userid" }),
                subject: 'Error en consulta mes',
                body:  emailMergeError.body.replace('--ERROR--', error),
            });
        }
    }

    function map(context) {
        // log.audit('context', context);
        var transaccion = JSON.parse(context.value);
        if (transaccion.values.custrecord_ft_mm_termes != '') {
            context.write({ key: transaccion.values.custrecord_ft_mm_termes, value: transaccion.values });
        } else {
            context.write({ key: [], value: transaccion.values });
        }
    }

    function reduce(context) {
        try {
            // log.audit('context reduce', context);
            var TerceroArray = {};
            if (context.key != '') {
                var inicio = JSON.parse(context.key)
                TerceroArray[inicio.value] = {}
                TerceroArray[inicio.value].terid = inicio.value
                TerceroArray[inicio.value].tername = inicio.text
                TerceroArray[inicio.value].cuentas = {};
                var excTer = inicio.value
                var cuentasTerArr = ''
                for (var i = 0; i < context.values.length; i++) {
                    var transaciones = JSON.parse(context.values[i])
                    var textCountr = 'countrycode.CUSTRECORD_FT_MM_TERMES":"'
                    var textDire = 'address1.CUSTRECORD_FT_MM_TERMES":"'
                    var textType = 'type.CUSTRECORD_FT_MM_TERMES":{"value":"'
                    var textZip = 'billzipcode.CUSTRECORD_FT_MM_TERMES":"'

                    var InicioSubCountry = context.values[i].indexOf(textCountr)
                    var FinalSubCountry = context.values[i].indexOf('"}')
                    var stringCoun = context.values[i].substring(InicioSubCountry + textCountr.length, context.values[i].length - 2)

                    var InicioSubtextDire = context.values[i].indexOf(textDire)
                    var FinalSubtextDire = context.values[i].indexOf('","type.CUSTRECORD_FT_MM_TERMES"')
                    var stringDire = context.values[i].substring(InicioSubtextDire + textDire.length, FinalSubtextDire)

                    var preIniTypeVendor = context.values[i].indexOf(textType)
                    var FinalSubtextTypeVendor = context.values[i].indexOf('","text":"Vendor"},"shipzip.CUSTRECORD_FT_MM_TERMES"')
                    if (FinalSubtextTypeVendor == -1) {
                        FinalSubtextTypeVendor = context.values[i].indexOf('","text":"Proveedor"},"shipzip.CUSTRECORD_FT_MM_TERMES"')
                    }
                    var stringPreTypeVendor = context.values[i].substring(preIniTypeVendor + textType.length, FinalSubtextTypeVendor)

                    var preIniTypeEmplo = context.values[i].indexOf(textType)
                    var FinalSubtextTypeEmplo = context.values[i].indexOf('","text":"Employee"},"shipzip.CUSTRECORD_FT_MM_TERMES"')
                    if (FinalSubtextTypeEmplo == -1) {
                        FinalSubtextTypeEmplo = context.values[i].indexOf('","text":"Empleado"},"shipzip.CUSTRECORD_FT_MM_TERMES"')
                    }
                    var stringPreTypeEmplo = context.values[i].substring(preIniTypeEmplo + textType.length, FinalSubtextTypeEmplo)

                    var preIniTypeCust = context.values[i].indexOf(textType)
                    var FinalSubtextTypeCust = context.values[i].indexOf('","text":"Customer"},"shipzip.CUSTRECORD_FT_MM_TERMES"')
                    if (FinalSubtextTypeCust == -1) {
                        FinalSubtextTypeCust = context.values[i].indexOf('","text":"Cliente"},"shipzip.CUSTRECORD_FT_MM_TERMES"')
                    }
                    var stringPreTypeCust = context.values[i].substring(preIniTypeCust + textType.length, FinalSubtextTypeCust)

                    var InitextZip = context.values[i].indexOf(textZip)
                    var FintextZip = context.values[i].indexOf('","countrycode.CUSTRECORD_FT_MM_TERMES"')
                    var stringZip = context.values[i].substring(InitextZip + textZip.length, FintextZip)

                    var custoText = 'customer'
                    var VendText = 'vendor'
                    var EmpText = 'employee'
                    var typeCusto = stringPreTypeCust.indexOf('CustJob')
                    var typeVend = stringPreTypeVendor.indexOf('Vendor')
                    var typeEmp = stringPreTypeEmplo.indexOf('Employee')
                    var typeTerc = ''
                    if (typeCusto >= 0) {
                        typeTerc = 'customer'
                    }
                    if (typeVend >= 0) {
                        typeTerc = 'vendor'
                    }
                    if (typeEmp >= 0) {
                        typeTerc = 'employee'
                    }

                    var stringCodDocu = transaciones.custrecord_ft_mm_tipidentifmes;
                    if (stringCodDocu != "") {
                        var tipoDocumento = search.lookupFields({ type: 'customrecord_ogfe_list_cod_doc', id: parseInt(stringCodDocu.value), columns: ['name', 'custrecord_ogfe_codigo'] });
                    }
                    var stringNumdoc = transaciones.custrecord_ft_mm_numidenmes;
                    var stringDV = transaciones.custrecord_ft_mm_dvmes;

                    TerceroArray[inicio.value].TerDoc = stringNumdoc
                    TerceroArray[inicio.value].TerCodDoc = tipoDocumento.custrecord_ogfe_codigo || '';
                    TerceroArray[inicio.value].TerCount = stringCoun
                    TerceroArray[inicio.value].TerDV = stringDV
                    TerceroArray[inicio.value].TerDire = stringDire
                    TerceroArray[inicio.value].TerType = typeTerc
                    TerceroArray[inicio.value].TerBillDep = stringZip.substring(0, 2)
                    TerceroArray[inicio.value].TerBillMuni = stringZip.substring(2, 5)
                    if (!TerceroArray[inicio.value].cuentas.hasOwnProperty(transaciones.custrecord_ft_mm_cuemes.value)) {
                        TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value] = {};
                        TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].cuenta = transaciones.custrecord_ft_mm_cuemes.value;
                        // TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].monto = transaciones.custrecord_ft_mm_monmes;
                        // TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].montoDB = transaciones.custrecord_ft_mm_modbmes;
                        // TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].montoCR = transaciones.custrecord_ft_mm_mocrmes; 
                        TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].monto = 0;
                        TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].montoimp = 0;
                        TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].movimientoContable = transaciones.custrecord_ft_mm_moviconmes;
                        if (transaciones.custrecord_ft_mm_concepmes != '') {
                            TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].concepto = transaciones.custrecord_ft_mm_concepmes.text;
                        } else {
                            TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].concepto = '';
                        }

                        cuentasTerArr += transaciones.custrecord_ft_mm_cuemes.value + ','
                        TerceroArray[inicio.value].ArrCuen = cuentasTerArr;
                    }
                    TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].monto += parseFloat(transaciones.custrecord_ft_mm_monbasmes);
                    TerceroArray[inicio.value].cuentas[transaciones.custrecord_ft_mm_cuemes.value].montoimp += parseFloat(transaciones.custrecord_ft_mm_totimpmes);
                }
            }
            if (count == 0) {
                var arrRecor = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1, isDynamic: true, })
                var arrCampTemp = arrRecor.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_arrcamp' })
                var arrConcTemp = arrRecor.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_arrconc' })
                var arrApliCueTemp = arrRecor.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_arraplcun' })
                var arrCuenCampTemp = arrRecor.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_arrcuecam' })
                var arrCuentas = arrRecor.getValue({ fieldId: 'custrecord_ft_mm_rec_arraycuenmm' })
                carpetaAlmacenamieto = arrRecor.getValue({ fieldId: 'custrecord_ft_mm_rec_caralm' })
                NombreFormato = arrRecor.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_nomfor' })
                arrCamp = JSON.parse(arrCampTemp)
                arrConcep = JSON.parse(arrConcTemp)
                arrapliCuen = JSON.parse(arrApliCueTemp)
                arrcuenCamp = JSON.parse(arrCuenCampTemp)
                arrCuentas = JSON.parse(arrCuentas)
            }

            fileObj = file.load('Salida de documento final/' + NombreFormato + '.csv').getContents();
            rowExcellCuerpo(TerceroArray[excTer], NombreFormato, carpetaAlmacenamieto)
            count = count + 1
            return TerceroArray

        } catch (error) {
            log.audit('ERROR', error);
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })

            var emailMergeError = render.mergeEmail({
                templateId: 3,
            });

            email.send({
                author: -5,
                recipients: arrRecord.getValue({ fieldId: "custrecord_ft_mm_rec_userid" }),
                subject: 'Error en consulta mes',
                body:  emailMergeError.body.replace('--ERROR--', error)
            });
        }

    }

    function summarize(summary) {
        try {
            var arrRecor = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1, isDynamic: true, })
            NombreFormato = arrRecor.getValue({ fieldId: 'custrecord_ft_mm_rec_arrcuenmm_nomfor' })
            fileObj = file.load('Salida de documento final/' + NombreFormato + '.csv');
            fileObj.name = NombreFormato + '_' + new Date() + '.csv';
            fileObj.save();
               
            var emailMergeResesult = render.mergeEmail({
                templateId: 2,
            });
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })

            email.send({
                author: -5,
                recipients: arrRecord.getValue({ fieldId: "custrecord_ft_mm_rec_userid" }),
                subject: 'Consulta Mes ha finalizado correctamente',
                body: emailMergeResesult.body.replace("--LINK--", fileObj.url),
            });


        } catch (error) {
            log.audit('ERROR', error);
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })
            var emailMergeError = render.mergeEmail({
                templateId: 3,
            });

            email.send({
                author: -5,
                recipients: arrRecord.getValue({ fieldId: "custrecord_ft_mm_rec_userid" }),
                subject: 'Error en consulta mes',
                body:  emailMergeError.body.replace('--ERROR--', error)
            });
        }
    }
    function rowExcellCuerpo(data, nomFor, carpetaAlmacenamieto) {
        try {
            var linea = ''
            var contador = 0
            for (var r = 0; r < arrConcep.length; r++) { //primero recoorro conceptos
                var validacionConcepto = valCuentasConceptos(data, arrConcep[r])
                if (validacionConcepto == true) {
                    for (var x = 0; x < arrCamp.length; x++) { //segundo recorrido recorro los campos o columnas del archivo a generar
                        // log.audit('arrCamp', arrCamp[x])
                        // log.audit('data', data)
                        if (arrapliCuen[x] == 'false' || arrapliCuen[x] == false || arrapliCuen[x] == 'F') {
                            var Columna_Original = arrCamp[x];
                            // Columna_Original = Columna_Original.replace(/ /g, '')
                            Columna_Original = Columna_Original.replace(/'á'/g, 'a')
                            Columna_Original = Columna_Original.replace(/'é'/g, 'e')
                            Columna_Original = Columna_Original.replace(/'í'/g, 'i')
                            Columna_Original = Columna_Original.replace(/'ó'/g, 'o')
                            Columna_Original = Columna_Original.replace(/'ú'/g, 'u')
                            var indexConcepto = Columna_Original.indexOf('Concepto')
                            var indexCodigo = Columna_Original.indexOf('Tipo de documento')
                            var indexPriNom = Columna_Original.indexOf('Primer nombre del informado')
                            var indexSegNomb = Columna_Original.indexOf('Otros nombres del informado')
                            var indexPriApe = Columna_Original.indexOf('Primer apellido del informado')
                            var indexSecApe = Columna_Original.indexOf('Segundo apellido del informado')
                            var indexRazonInfo = Columna_Original.indexOf('Razon social informado')
                            var indexDoc = Columna_Original.indexOf('Numero identificacion')
                            var indexPai = Columna_Original.indexOf('Pais de Residencia o domicilio')
                            var indexDir = Columna_Original.indexOf('Direccion')
                            var indexCodDep = Columna_Original.indexOf('Codigo dpto')
                            var indexCodMuni = Columna_Original.indexOf('Codigo mcp')
                            var indexDv = Columna_Original.indexOf('DV')
                            if (indexConcepto >= 0 || indexCodigo >= 0 || indexPriNom >= 0 || indexSegNomb >= 0 || indexPriApe >= 0 || indexSecApe >= 0 || indexDoc >= 0 || indexPai >= 0 || indexDir >= 0 || indexDv >= 0 || indexRazonInfo >= 0 || indexCodDep >= 0 || indexCodMuni >= 0) {
                                if (data.TerCodDoc == 13) {
                                    if (indexConcepto >= 0) {
                                        xmlExcell += arrConcep[r] + ','
                                        continue
                                    }
                                    if (indexCodigo >= 0) {
                                        xmlExcell += data.TerCodDoc + ','
                                        continue
                                    }
                                    if (indexPriNom >= 0 || indexSegNomb >= 0 || indexPriApe >= 0 || indexSecApe >= 0 || indexRazonInfo >= 0) {
                                        var Entity = record.load({ type: data.TerType, id: data.terid, })
                                        if (data.TerType == 'employee') {
                                            var first = Entity.getValue({ fieldId: 'firstname' })
                                            var middle = Entity.getValue({ fieldId: 'middlename' })
                                            var last = Entity.getValue({ fieldId: 'lastname' })
                                            var seconApp = last.indexOf(' ')
                                            if (seconApp > 0) {
                                                var seconARR = last.split(' ')
                                                if (indexPriNom >= 0) {
                                                    xmlExcell += first + ','
                                                    continue
                                                }
                                                if (indexSegNomb >= 0) {
                                                    xmlExcell += middle + ','
                                                    continue
                                                }
                                                if (indexPriApe >= 0) {
                                                    xmlExcell += seconARR[0] + ','
                                                    continue
                                                }
                                                if (indexSecApe >= 0) {
                                                    xmlExcell += seconARR[1] + ','
                                                    continue
                                                }
                                                if (indexRazonInfo >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                            }
                                            else {
                                                if (indexPriNom >= 0) {
                                                    xmlExcell += first + ','
                                                    continue
                                                }
                                                if (indexSegNomb >= 0) {
                                                    xmlExcell += middle + ','
                                                    continue
                                                }
                                                if (indexPriApe >= 0) {
                                                    xmlExcell += last + ','
                                                    continue
                                                }
                                                if (indexSecApe >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexRazonInfo >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                            }
                                        }
                                        if (data.TerType == 'customer' || data.TerType == 'vendor') {
                                            var isperson = Entity.getValue({ fieldId: 'isperson' })
                                            // log.audit('isperson', isperson)
                                            if (isperson == true || isperson == 'T') {
                                                var first = Entity.getValue({ fieldId: 'firstname' })
                                                var middle = Entity.getValue({ fieldId: 'middlename' })
                                                var last = Entity.getValue({ fieldId: 'lastname' })
                                                var seconApp = last.indexOf(' ')
                                                if (seconApp > 0) {
                                                    var seconARR = last.split(' ')
                                                    if (indexPriNom >= 0) {
                                                        xmlExcell += first + ','
                                                        continue
                                                    }
                                                    if (indexSegNomb >= 0) {
                                                        xmlExcell += middle + ','
                                                        continue
                                                    }
                                                    if (indexPriApe >= 0) {
                                                        xmlExcell += seconARR[0] + ','
                                                        continue
                                                    }
                                                    if (indexSecApe >= 0) {
                                                        xmlExcell += seconARR[1] + ','
                                                        continue
                                                    }
                                                    if (indexRazonInfo >= 0) {
                                                        xmlExcell += ' ' + ','
                                                        continue
                                                    }
                                                }
                                                else {
                                                    if (indexPriNom >= 0) {
                                                        xmlExcell += first + ','
                                                        continue
                                                    }
                                                    if (indexSegNomb >= 0) {
                                                        xmlExcell += middle + ','
                                                        continue
                                                    }
                                                    if (indexPriApe >= 0) {
                                                        xmlExcell += last + ','
                                                        continue
                                                    }
                                                    if (indexSecApe >= 0) {
                                                        xmlExcell += ' ' + ','
                                                        continue
                                                    }
                                                    if (indexRazonInfo >= 0) {
                                                        xmlExcell += ' ' + ','
                                                        continue
                                                    }
                                                }
                                            }
                                            else {
                                                var companyname = Entity.getValue({ fieldId: 'companyname' })
                                                if (indexPriNom >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexSegNomb >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexPriApe >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexSecApe >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexRazonInfo >= 0) {
                                                    xmlExcell += companyname + ','
                                                    continue
                                                }

                                            }
                                        }
                                    }

                                    if (indexDoc >= 0) {
                                        xmlExcell += data.TerDoc + ','
                                        continue
                                    }
                                    if (indexPai >= 0) {
                                        xmlExcell += data.TerCount + ','
                                        continue
                                    }
                                    if (indexDir >= 0) {
                                        xmlExcell += data.TerDire + ','
                                        continue
                                    }
                                    if (indexCodDep >= 0) {
                                        xmlExcell += data.TerBillDep + ','
                                        continue
                                    }
                                    if (indexCodMuni >= 0) {
                                        xmlExcell += data.TerBillMuni + ','
                                        continue
                                    }
                                    if (indexDv >= 0) {
                                        xmlExcell += data.TerDV + ','
                                        continue
                                    }
                                }
                                else {
                                    if (indexConcepto >= 0) {
                                        xmlExcell += arrConcep[r] + ','
                                        continue
                                    }
                                    if (indexCodigo >= 0) {
                                        xmlExcell += data.TerCodDoc + ','
                                        continue
                                    }
                                    if (indexPriNom >= 0 || indexSegNomb >= 0 || indexPriApe >= 0 || indexSecApe >= 0 || indexRazonInfo >= 0) {
                                        var Entity = record.load({ type: data.TerType, id: data.terid, })
                                        if (data.TerType == 'employee') {
                                            var first = Entity.getValue({ fieldId: 'firstname' })
                                            var middle = Entity.getValue({ fieldId: 'middlename' })
                                            var last = Entity.getValue({ fieldId: 'lastname' })
                                            var seconApp = last.indexOf(' ')
                                            if (seconApp > 0) {
                                                var seconARR = last.split(' ')
                                                if (indexPriNom >= 0) {
                                                    xmlExcell += first + ','
                                                    continue
                                                }
                                                if (indexSegNomb >= 0) {
                                                    xmlExcell += middle + ','
                                                    continue
                                                }
                                                if (indexPriApe >= 0) {
                                                    xmlExcell += seconARR[0] + ','
                                                    continue
                                                }
                                                if (indexSecApe >= 0) {
                                                    xmlExcell += seconARR[1] + ','
                                                    continue
                                                }
                                                if (indexRazonInfo >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                            }
                                            else {
                                                if (indexPriNom >= 0) {
                                                    xmlExcell += first + ','
                                                    continue
                                                }
                                                if (indexSegNomb >= 0) {
                                                    xmlExcell += middle + ','
                                                    continue
                                                }
                                                if (indexPriApe >= 0) {
                                                    xmlExcell += last + ','
                                                    continue
                                                }
                                                if (indexSecApe >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexRazonInfo >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                            }
                                        }
                                        if (data.TerType == 'customer' || data.TerType == 'vendor') {
                                            var isperson = Entity.getValue({ fieldId: 'isperson' })
                                            //log.audit('isperson', isperson)
                                            if (isperson == true || isperson == 'T') {
                                                var first = Entity.getValue({ fieldId: 'firstname' })
                                                var middle = Entity.getValue({ fieldId: 'middlename' })
                                                var last = Entity.getValue({ fieldId: 'lastname' })
                                                var seconApp = last.indexOf(' ')
                                                if (seconApp > 0) {
                                                    var seconARR = last.split(' ')
                                                    if (indexPriNom >= 0) {
                                                        xmlExcell += first + ','
                                                        continue
                                                    }
                                                    if (indexSegNomb >= 0) {
                                                        xmlExcell += middle + ','
                                                        continue
                                                    }
                                                    if (indexPriApe >= 0) {
                                                        xmlExcell += seconARR[0] + ','
                                                        continue
                                                    }
                                                    if (indexSecApe >= 0) {
                                                        xmlExcell += seconARR[1] + ','
                                                        continue
                                                    }
                                                    if (indexRazonInfo >= 0) {
                                                        xmlExcell += ' ' + ','
                                                        continue
                                                    }
                                                }
                                                else {
                                                    if (indexPriNom >= 0) {
                                                        xmlExcell += first + ','
                                                        continue
                                                    }
                                                    if (indexSegNomb >= 0) {
                                                        xmlExcell += middle + ','
                                                        continue
                                                    }
                                                    if (indexPriApe >= 0) {
                                                        xmlExcell += last + ','
                                                        continue
                                                    }
                                                    if (indexSecApe >= 0) {
                                                        xmlExcell += ' ' + ','
                                                        continue
                                                    }
                                                    if (indexRazonInfo >= 0) {
                                                        xmlExcell += ' ' + ','
                                                        continue
                                                    }
                                                }
                                            }
                                            else {
                                                var companyname = Entity.getValue({ fieldId: 'companyname' })
                                                if (indexPriNom >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexSegNomb >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexPriApe >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexSecApe >= 0) {
                                                    xmlExcell += ' ' + ','
                                                    continue
                                                }
                                                if (indexRazonInfo >= 0) {
                                                    xmlExcell += companyname + ','
                                                    continue
                                                }

                                            }
                                        }
                                    }

                                    if (indexDoc >= 0) {
                                        xmlExcell += data.TerDoc + ','
                                        continue
                                    }
                                    if (indexPai >= 0) {
                                        xmlExcell += data.TerCount + ','
                                        continue
                                    }
                                    if (indexDir >= 0) {
                                        xmlExcell += data.TerDire + ','
                                        continue
                                    }
                                    if (indexDv >= 0) {
                                        xmlExcell += data.TerDV + ','
                                        continue
                                    }
                                    if (indexCodDep >= 0) {
                                        xmlExcell += data.TerBillDep + ','
                                        continue
                                    }
                                    if (indexCodMuni >= 0) {
                                        xmlExcell += data.TerBillMuni + ','
                                        continue
                                    }
                                }
                            }
                            else {
                                xmlExcell += ' ' + ','
                            }
                        } else {
                            var arrCuentasCampos = []
                            var cuentaCampo = arrcuenCamp[x] //Array con cuentas campos esto es los id de los campos que se tienen con una e nombre de la columna 
                            // log.audit('arrcuenCamp[x]', arrcuenCamp[x])
                            // log.audit('cuentaCampo', cuentaCampo.length)
                            var valorColumCuent = 0
                            if (cuentaCampo != '' && cuentaCampo != ' ') {
                                var spliflag = cuentaCampo.indexOf(',')
                                // log.audit('spliflag', spliflag)
                                if (spliflag > 0) {
                                    arrCuentasCampos = cuentaCampo.split(',')
                                    var arrCuentas = data.ArrCuen.split(',')
                                    for (var w = 0; w < arrCuentasCampos.length; w++) {
                                        var valTerCuenVsCuenCam = arrCuentas.indexOf(arrCuentasCampos[w])// sivale ya que las dos comparativas son cuentas
                                        if (valTerCuenVsCuenCam >= 0) {
                                            var cuentaEscogida = data.cuentas[arrCuentasCampos[w]]
                                            if (cuentaEscogida.concepto == arrConcep[r]) {
                                                if (data.cuentas[arrCuentasCampos[w]].movimientoContable != '') {
                                                    var Movimiento = data.cuentas[arrCuentasCampos[w]].movimientoContable.value
                                                } else {
                                                    var Movimiento = 2
                                                }
                                                if (Movimiento == 1) {
                                                    valorColumCuent += parseFloat(cuentaEscogida.montoimp)
                                                    var parseo = format.format({ value: parseFloat(cuentaEscogida.monto), type: format.Type.CURRENCY });
                                                }
                                                else if (Movimiento == 2) {
                                                    valorColumCuent += parseFloat(cuentaEscogida.montoimp)
                                                    var parseo = format.format({ value: parseFloat(cuentaEscogida.montoimp), type: format.Type.CURRENCY });
                                                }
                                            }
                                        }
                                        else {
                                            valorColumCuent += 0
                                        }

                                    }
                                    if (valorColumCuent > 0 || valorColumCuent < 0) {
                                        var parseo = Math.abs(valorColumCuent.toFixed(2));
                                        xmlExcell += parseo + ','
                                    }
                                    else {
                                        xmlExcell += ' ' + ','
                                    }
                                } else {
                                    var arrCuentas = data.ArrCuen.split(',')
                                    var valCuentas = arrCuentas.indexOf(cuentaCampo)
                                    // log.audit('valCuentas', valCuentas)
                                    if (valCuentas >= 0) {
                                        var cuentaEscogida = data.cuentas[cuentaCampo]
                                        // log.audit(' data.cuentas[cuentaCampo]', data.cuentas[cuentaCampo])
                                        if (cuentaEscogida.concepto == arrConcep[r]) {
                                            if (data.cuentas[cuentaCampo].movimientoContable != '') {
                                                var Movimiento = data.cuentas[cuentaCampo].movimientoContable.value
                                            } else {
                                                var Movimiento = 2
                                            }
                                            if (Movimiento == 1) {
                                                valorColumCuent += parseFloat(cuentaEscogida.montoimp)
                                            }
                                            else if (Movimiento == 2) {
                                                valorColumCuent += parseFloat(cuentaEscogida.montoimp)
                                            }
                                        }
                                    }
                                    if (valorColumCuent > 0 || valorColumCuent < 0) {
                                        var parseo = Math.abs(valorColumCuent.toFixed(2));
                                        xmlExcell += parseo + ','
                                    } else {
                                        xmlExcell += ' ' + ','
                                    }
                                }
                            } else {
                                // log.audit('Ingreso en 0', 'Ingreso en 0')
                                xmlExcell += '0' + ','
                            }
                        }
                    }
                    if (contador == 0) {
                        linea = xmlExcell
                    }
                    else {
                        linea = linea + '\n' + xmlExcell
                    }
                    xmlExcell = ''
                    contador++
                }
            }

            if (linea != '') {
                fileObj = fileObj + '\n' + linea
            }
            linea = ''
            var xlsfile = file.create({ name: nomFor + '.csv', fileType: file.Type.PLAINTEXT, contents: fileObj });
            xlsfile.folder = carpetaAlmacenamieto;
            var fileID = xlsfile.save();
        } catch (error) {
            log.audit('Error Row Cuerpo', error);
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })
            var emailMergeError = render.mergeEmail({
                templateId: 3,
            });

            email.send({
                author: -5,
                recipients: arrRecord.getValue({ fieldId: "custrecord_ft_mm_rec_userid" }),
                subject: 'Error en consulta mes',
                body:  emailMergeError.body.replace('--ERROR--', error)
            });
        }
    }
    function rowExcellCabecera(numCell, data, nomFor, carpetaAlmacenamieto) {
        try {
            fileObj = file.load('../Plantilla_MM.xml').getContents();
            for (var x = 0; x < numCell; x++) {
                if ((x + 1) == numCell) {
                    xmlExcell += data[x]
                }
                else {
                    xmlExcell += data[x] + ','
                }
            }
            var xlsfile = file.create({ name: nomFor + '.csv', fileType: file.Type.PLAINTEXT, contents: xmlExcell });
            xlsfile.folder = carpetaAlmacenamieto;
            //save file
            var fileID = xlsfile.save();

        } catch (error) {
            log.audit('Error RowCabecera', error)
        }


    }
    function valArrs(array1, array2, cuentasTer, MovimienConcp) {
        try {

            var estado = false
            var arrCuentas = cuentasTer.ArrCuen.split(',')
            for (var z = 0; z < array1.length; z++) {
                if (array1[z] == 'true' || array1[z] == true || array1[z] == 'T') {
                    var cuentaCampo = arrcuenCamp[z]
                    if (cuentaCampo != '') {
                        var spliflag = cuentaCampo.indexOf(',')
                        if (spliflag > 0) {
                            var arrCuentasCampos = cuentaCampo.split(',')

                            for (var j = 0; j < arrCuentasCampos.length; j++) {
                                var valCuenCampvsConCuen = array2.indexOf(arrCuentasCampos[j])
                                var valCuenCampvsCuentTer = arrCuentas.indexOf(arrCuentasCampos[j])
                                if (valCuenCampvsConCuen >= 0 && valCuenCampvsCuentTer >= 0) {
                                    //log.audit('valCuenCampvsConCuen_____valCuenCampvsConCuen', arrCuentasCampos[j] + ' - ' + valCuenCampvsConCuen + ' - ' + valCuenCampvsCuentTer)
                                    var cuentaEscogida = cuentasTer.cuentas[arrCuentasCampos[j]]
                                    if (MovimienConcp == 1) {
                                        //log.audit('parseInt(cuentaEscogida.monto)', parseFloat(cuentaEscogida.monto))
                                        if (parseFloat(cuentaEscogida.monto) < 0 || parseFloat(cuentaEscogida.monto) > 0) {
                                            estado = true
                                            break
                                        }
                                    }
                                    else if (MovimienConcp == 2) {
                                        //log.audit('parseFloat(cuentaEscogida.montoDB)', parseFloat(cuentaEscogida.montoDB))
                                        if (parseFloat(cuentaEscogida.montoDB) < 0 || parseFloat(cuentaEscogida.montoDB) > 0) {
                                            estado = true
                                            break
                                        }
                                    }
                                    else if (MovimienConcp == 3) {
                                        //log.audit('parseFloat(cuentaEscogida.montoCR)', parseFloat(cuentaEscogida.montoCR))
                                        if (parseFloat(cuentaEscogida.montoCR) < 0 || parseFloat(cuentaEscogida.montoCR) > 0) {
                                            estado = true
                                            break
                                        }
                                    }
                                    else if (MovimienConcp == 4) {//DB-CR
                                        var resta = parseFloat(cuentaEscogida.montoDB) - parseFloat(cuentaEscogida.montoCR)
                                        //log.audit('resta cr', resta)
                                        if (resta < 0 || resta > 0) {
                                            estado = true
                                            break
                                        }
                                    }
                                    else if (MovimienConcp == 5) {//CR-DB
                                        var resta = parseFloat(cuentaEscogida.montoCR) - parseFloat(cuentaEscogida.montoDB)
                                        //log.audit('resta db', resta)
                                        if (resta < 0 || resta > 0) {
                                            estado = true
                                            break
                                        }
                                    }

                                }
                            }
                        }
                        else {
                            var valCuenCampvsConCuen = array2.indexOf(cuentaCampo)
                            var valCuenCampvsCuentTer = arrCuentas.indexOf(arrCuentasCampos[j])
                            if (valCuenCampvsConCuen >= 0 && valCuenCampvsCuentTer >= 0) {
                                var cuentaEscogida = cuentasTer.cuentas[arrCuentasCampos[j]]
                                if (MovimienConcp == 1) {
                                    //log.audit('parseInt(cuentaEscogida.monto)', parseFloat(cuentaEscogida.monto))
                                    if (parseFloat(cuentaEscogida.monto) < 0 || parseFloat(cuentaEscogida.monto) > 0) {
                                        estado = true
                                        break
                                    }
                                }
                                else if (MovimienConcp == 2) {
                                    //log.audit('parseFloat(cuentaEscogida.montoDB)', parseFloat(cuentaEscogida.montoDB))
                                    if (parseFloat(cuentaEscogida.montoDB) < 0 || parseFloat(cuentaEscogida.montoDB) > 0) {
                                        estado = true
                                        break
                                    }
                                }
                                else if (MovimienConcp == 3) {
                                    //log.audit('parseFloat(cuentaEscogida.montoCR)', parseFloat(cuentaEscogida.montoCR))
                                    if (parseFloat(cuentaEscogida.montoCR) < 0 || parseFloat(cuentaEscogida.montoCR) > 0) {
                                        estado = true
                                        break
                                    }
                                }
                                else if (MovimienConcp == 4) {//DB-CR
                                    var resta = parseFloat(cuentaEscogida.montoDB) - parseFloat(cuentaEscogida.montoCR)
                                    //log.audit('resta cr', resta)
                                    if (resta < 0 || resta > 0) {
                                        estado = true
                                        break
                                    }
                                }
                                else if (MovimienConcp == 5) {//CR-DB
                                    var resta = parseFloat(cuentaEscogida.montoCR) - parseFloat(cuentaEscogida.montoDB)
                                    //log.audit('resta db', resta)
                                    if (resta < 0 || resta > 0) {
                                        estado = true
                                        break
                                    }
                                }
                            }
                        }
                    }

                }
            }
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })

            email.send({
                author: -5,
                recipients: arrRecord.getValue({ fieldId: "custrecord_ft_mm_rec_userid" }),
                subject: 'Consulta Mes ha finalizado correctamente',
                body: 'Revisa el registro.',
            });
            //log.audit('Finalice', '---------------------- ' + estado +' --------------------------')
            return estado
        } catch (error) {
            log.debug('Error Validacion de cuentas conceptos vs campos', error);
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })

            var emailMergeError = render.mergeEmail({
                templateId: 3,
            });

            email.send({
                author: -5,
                recipients: arrRecord.getValue({ fieldId: "custrecord_ft_mm_rec_userid" }),
                subject: 'Error en consulta mes',
                body:  emailMergeError.body.replace('--ERROR--', error)
            });
        }


    }
    function valCuentasConceptos(data, arrConcep) {
        try {
            var flagConcepto = false;
            for (var i in data.cuentas) {
                if (data.cuentas[i].concepto == arrConcep) {
                    flagConcepto = true;
                }
            }
            return flagConcepto;
        } catch (error) {
            log.debug('Error Validacion de cuentas conceptos vs campos', error);
            var arrRecord = record.load({ type: 'customrecord_ft_mm_rec_arrcuenmm', id: 1 })

            var emailMergeError = render.mergeEmail({
                templateId: 3,
            });

            email.send({
                author: -5,
                recipients: arrRecord.getValue({ fieldId: "custrecord_ft_mm_rec_userid" }),
                subject: 'Error en consulta mes',
                body:  emailMergeError.body.replace('--ERROR--', error)
            });
        }


    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});