import { useEffect, useState } from "react";

export default function Disciplines() {
    const [disciplines, setDisciplines] = useState([]);

    useEffect(() => {
        const requestOptions = {
            method: "GET",
            redirect: "follow"
        };
        
        fetch("http://localhost:3000/countries", requestOptions)
            .then((response) => response.json())
            .then((result) => {
                // Collect all unique disciplines from each country
                const disciplineMap = new Map();
                result.forEach(country => {
                    country.disciplines.forEach(discipline => {
                        if (!disciplineMap.has(discipline.name)) {
                            disciplineMap.set(discipline.name, discipline);
                        }
                    });
                });
                setDisciplines(Array.from(disciplineMap.values()));
            })
            .catch((error) => console.error(error));
    }, []);

    return (
        <>
            <div className="header-container">
                <svg onClick={() => window.location.href = "http://localhost:3001/"} width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="17" cy="17" r="16" transform="matrix(-1 0 0 1 34 0)" stroke="white" strokeWidth="2"/>
                    <path d="M9.71429 17L15.7857 23.0714M9.71429 17L15.7857 10.9286M9.71429 17L23.881 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <img src="./logo-sm-white.png" alt="Logo"/>
            </div>

            <h1>Disciplines</h1>
            <div style={{ maxWidth: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div className="buttons">
                    {
                        disciplines.length > 0 ? disciplines.map((discipline, index) => {
                            return (
                                <button key={index} onClick={() => { window.location.href = `/discipline-info?d=${discipline.name}` }}>
                                    <img src={`./${discipline.image}`} alt={discipline.name} />{discipline.name}
                                </button>
                            );
                        }) : null
                    }
                </div>
            </div>
        </>
    );
}