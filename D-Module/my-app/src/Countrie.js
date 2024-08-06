import { useEffect, useState } from "react"
import { useFetcher, useSearchParams } from "react-router-dom";

export default function Countries() {
    const [countries, setCountries] = useState();
    const [countrie, setCountrie] = useState();
    var [searchParams] = useSearchParams();

    useEffect(() => {
        const requestOptions = {
            method: "GET",
            redirect: "follow"
        };

        fetch("http://localhost:3000/countries", requestOptions)
            .then((response) => response.json())
            .then((result) => setCountries(result))
            .catch((error) => console.error(error));
    }, []);
    useEffect(() => {
        if (!countries) {
            return;
        }
        var countrieSearch = searchParams.get("c");
        for (var j = 0; j < countries.length; j++) {
            if (countrieSearch == countries[j].name) {
                setCountrie(countries[j]);
            }
        }
    }, [countries]);
    return (
        <>
            <div className="header-container"><svg onClick={() => window.location.href = "http://localhost:3001/countries"} width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="17" cy="17" r="16" transform="matrix(-1 0 0 1 34 0)" stroke="white" stroke-width="2" />
                <path d="M9.71429 17L15.7857 23.0714M9.71429 17L15.7857 10.9286M9.71429 17L23.881 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
                <img src="./logo-sm-white.png" />
            </div>

            {
                countrie ? <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        <h1>{countrie.name}</h1>
                        <img style={{ width: "200px" }} src={"./" + countrie.flag} />
                        <table className="table-medals">
                            <thead>
                                <tr>
                                    <td>GOLD</td>
                                    <td>SILVER</td>
                                    <td>BRONZE</td>
                                    <td>TOTAL</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{countrie.medals.gold}</td>
                                    <td>{countrie.medals.silver}</td>
                                    <td>{countrie.medals.bronze}</td>
                                    <td>{countrie.medals.gold + countrie.medals.silver + countrie.medals.bronze}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="buttons">
                            <button onClick={() => window.location.href = "/countrie-medal?c="+countrie.name+"&m=gold"}>
                                <img src="./gold.png" />
                                Medals</button>
                            <button onClick={() => window.location.href = "/countrie-medal?c="+countrie.name+"&m=silver"}>
                                <img src="./silver.png" />
                                Medals</button>
                            <button onClick={() => window.location.href = "/countrie-medal?c="+countrie.name+"&m=bronze"}>
                                <img src="./bronze.png" />
                                Medals</button>
                        </div>
                    </div>
                </> : <>
                </>
            }

        </>
    )
}