import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function DisciplineInfo() {
    const [countries, setCountries] = useState([]);
    const [disciplineInfo, setDisciplineInfo] = useState([]);
    const [discipline, setDiscipline] = useState();
    const [country, setCountry] = useState();
    const [searchParams] = useSearchParams();
    const [disciplineImage, setDisciplineImage] = useState();

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
        if (!countries.length) {
            return;
        }

        const disciplineSearch = searchParams.get("d");
        const countrySearch = searchParams.get("c");
        setDiscipline(disciplineSearch);
        setCountry(countrySearch);

        const disciplineData = countries.map(country => {
            const countryDiscipline = country.disciplines.find(d => d.name === disciplineSearch);
            if (countryDiscipline) {
                setDisciplineImage(countryDiscipline.image);

                return {
                    country: country.name,
                    flag: country.flag,
                    medals: {
                        gold: countryDiscipline.gold,
                        silver: countryDiscipline.silver,
                        bronze: countryDiscipline.bronze,
                    }
                };
            }
            return null;
        }).filter(data => data !== null);

        setDisciplineInfo(disciplineData);
    }, [countries, searchParams]);

    const countryInfo = disciplineInfo.find(info => info.country === country);

    return (
        <>
            <div className="header-container">
                <svg onClick={() => {window.location.href = "http://localhost:3001/discipline-info?d="+discipline+"&c="+country}} width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="17" cy="17" r="16" transform="matrix(-1 0 0 1 34 0)" stroke="white" strokeWidth="2" />
                    <path d="M9.71429 17L15.7857 23.0714M9.71429 17L15.7857 10.9286M9.71429 17L23.881 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <img src="./logo-sm-white.png" alt="Logo" />
            </div>

            {
                discipline && countryInfo ? (
                    <div style={{ color: "#Fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        <h1>{discipline}</h1>
                        {disciplineImage && <img src={`./${disciplineImage}`} alt={discipline} style={{ width: "200px", marginBottom: "20px" }} />}
                        <h2>{countryInfo.country}</h2>
                        <table className="table-medals">
                            <thead>
                                <tr>
                                    <td>Gold</td>
                                    <td>Silver</td>
                                    <td>Bronze</td>
                                    <td>Total</td>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{countryInfo.medals.gold}</td>
                                    <td>{countryInfo.medals.silver}</td>
                                    <td>{countryInfo.medals.bronze}</td>
                                    <td>{countryInfo.medals.gold + countryInfo.medals.silver + countryInfo.medals.bronze}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div>Loading...</div>
                )
            }
        </>
    );
}
