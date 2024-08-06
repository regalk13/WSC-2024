import { useEffect, useState } from "react"
import { useFetcher } from "react-router-dom";

export default function Countries() {
    const [countries, setCountries] = useState();

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
 
    return (
        <>
            <div className="header-container"><svg onClick={() => window.location.href = "http://localhost:3001/"} width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="17" cy="17" r="16" transform="matrix(-1 0 0 1 34 0)" stroke="white" stroke-width="2"/>
<path d="M9.71429 17L15.7857 23.0714M9.71429 17L15.7857 10.9286M9.71429 17L23.881 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
<img  src="./logo-sm-white.png"/>
</div>

        <h1>Countries</h1>
        <div style={{maxWidth: "100%", display: "flex", justifyContent: "center", alignItems: "center"}}>
        <div className="buttons">
        {
            countries ? countries.map((countrie) => {
                return (<button onClick={() => {window.location.href = "/countrie?c="+countrie.name}}><img src={"./"+countrie.flag} />{countrie.name}</button>)
            }) : null 
        }
        </div>
        </div>

        </>
    )
}