import { useEffect, useState } from "react"
import { useFetcher, useSearchParams } from "react-router-dom";

export default function Countries() {
    const [countries, setCountries] = useState();
    const [countrie, setCountrie] = useState();
    var [searchParams] = useSearchParams();
    var [disciplines, setDisciplines] = useState();
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
        var disciplines = [];
        for (var j = 0; j < countries.length; j++) {
            if (countrieSearch == countries[j].name) {
                setCountrie(countries[j]);
                for (var k = 0; k < countries[j].disciplines.length; k++) {
                    if (countries[j].disciplines[k][searchParams.get("m")] > 0) {
                        disciplines.push({ name: countries[j].disciplines[k].name, q: countries[j].disciplines[k][searchParams.get("m")]});
                    }
                }
            }
        }
        setDisciplines(disciplines);
    }, [countries]);
    return (
        <>
                    {
                countrie ? <>
            <div className="header-container"><svg onClick={() => window.location.href = "http://localhost:3001/countrie?c="+countrie.name} width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="17" cy="17" r="16" transform="matrix(-1 0 0 1 34 0)" stroke="white" stroke-width="2" />
                <path d="M9.71429 17L15.7857 23.0714M9.71429 17L15.7857 10.9286M9.71429 17L23.881 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
                <img src="./logo-sm-white.png" />
            </div>


                    <div style={{ color: "#Fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        <h1>{countrie.name}</h1>
                        <img style={{ width: "200px" }} src={"./" + countrie.flag} />
                        <p style={{fontSize: "40px", padding: "0px", margin: "0px", marginTop: "10px"}}>{searchParams.get("m")[0].toUpperCase()+searchParams.get("m").slice(1)} Medals</p>
                        <p  style={{fontSize: "40px", padding: "0px", margin: "0px", marginTop: "10px"}}>{countrie.medals[searchParams.get("m")]}</p>
                        <table className="table-medals">
                        <thead>
                                <tr>
                                    <td>DISCIPLINE</td>
                                    <td>MEDALS</td>
                                </tr>
                            </thead>
                        {
                            disciplines ? <>
                            {
                                disciplines.map((discipline) => {
                                    return ( <tr>   <td>{discipline.name}</td><td>{discipline.q}</td> </tr>
                                 )
                                })
                            }
                            </>: null
                        }
                        </table>
                    </div>
                </> : <>
                </>
            }

        </>
    )
}