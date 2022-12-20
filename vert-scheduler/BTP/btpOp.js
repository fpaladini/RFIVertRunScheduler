const express = require('express');

const PORT = process.env.PORT || 4559;

const bodyParser = require('body-parser');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;
const passport = require('passport');
const request = require('request');
const axios = require('axios');
const qs = require('qs');
const cfenv = require('cfenv');
const creds = require('service-credentials');
const hostBTP = "https://fstech-infr-ferr-prd-vert-verticale-esterni-srv.cfapps.eu10.hana.ondemand.com/catalog"

async function authBtp() {
    var credentials = creds.getCredentials('vert_scheduler_UPS');
    var btpCredentials = JSON.parse(JSON.stringify(credentials));
    //console.log(appEnv);
    //console.log("\x1b[32m", "App Env servizi:\n" + JSON.stringify(appEnv.getServices()));
    //console.log("\x1b[33m", "App Env Singolo servizio:\n" + JSON.stringify(appEnv.getServices('uaa_vert-scheduler')));
    //console.log('\x1b[34m', "Credenziali:\n" + JSON.stringify(credentials));
   // console.log('"\x1b[30m"', "-----------------------")

    var btpServiceTokenUrl = 'https://infr-ferr-prd.authentication.eu10.hana.ondemand.com/oauth/token?grant_type=client_credentials&response_type=token';
    var btpUser = btpCredentials["BTP_USER"]; 
    var btpPassword = btpCredentials["BTP_PASSWORD"];

    var buff = Buffer.from(btpUser + ":" + btpPassword, 'utf8');
    var btpBasicAuth = 'Basic ' + buff.toString('base64');

    // get bearer token from btp
    var btpConfig = {
        'method': 'POST',
        'url': btpServiceTokenUrl,
        'headers': {
            'Authorization': btpBasicAuth
        }
    };

    var response = await getToken(btpConfig);
    const btpBearerToken = response.data.access_token;

    return btpBearerToken;
}

async function takeAbAgNull(token){

    var btpServiceUrl = hostBTP + "/Abilitazioni_Ag?$filter=flag eq '' and data_abil eq null"
    var btpOptions = {
        method: "GET",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json',
        }
    };

    var responseBTP = await axios(btpOptions);
           // console.log(" --> OK:" + JSON.stringify(responseBTP.data));
    var results = responseBTP.data.value;

    return results;

}

async function takeAbAgNotNull(token){

    var btpServiceUrl = hostBTP + "/Abilitazioni_Ag?$filter=flag eq 'X' and data_abil ne null"
    var btpOptions = {
        method: "GET",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json',
        }
    };

    var responseBTP = await axios(btpOptions);
    //console.log(" --> OK:" + JSON.stringify(responseBTP.data));
    var results = responseBTP.data.value;

    return results;

}

async function takeAb(token){

    var btpServiceUrl = hostBTP + "/Abilitazioni"
    var btpOptions = {
        method: "GET",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json',
        }
    };

    var responseBTP = await axios(btpOptions);
           // console.log(" --> OK:" + JSON.stringify(responseBTP.data));
    var results = responseBTP.data.value;

    return results;

}

async function takeEmailAgenti(token,aAbAgNull){

    var arr = [];
    var btpServiceUrl = null;
    var btpOptions = null;
    var responseBTP = null;
    var result = null;

    for (var i = 0; i < aAbAgNull.length; i++){
        console.log("Codice Fiscale: " + aAbAgNull[i].cod_fisc)
        var idAbil = aAbAgNull[i].id;
        btpServiceUrl = hostBTP + "/Agenti?$filter=cod_fisc eq '" + aAbAgNull[i].cod_fisc + "'&$select=email"
        btpOptions = {
            method: "GET",
            url: btpServiceUrl,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/json'
            }};
        responseBTP = await axios(btpOptions);
        for (var j = 0 ; j < responseBTP.data.value.length; j++){
            result = responseBTP.data.value[j];
            result.id_abil = idAbil;
            console.log("Risultato da cf " + aAbAgNull[i].cod_fisc + " : " + JSON.stringify(result))
            arr.push(result);
        }
        
    }
    console.log("Mail da mandare a server" + JSON.stringify(arr))
    return arr;

}

async function putFlagAbAg(token,usersFinal){


    for(var i = 0; i < usersFinal.length; i++){
    var btpServiceUrl = hostBTP + "/Abilitazioni_Ag(cod_fisc='" + usersFinal[i].CF +"',id='" + usersFinal[i].ID_ABILITAZIONE +"')" ;
    var date = new Date();
    var btpOptions = {
        method: "PATCH",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            "flag" : "X",
            "data_abil": date.getFullYear() +  "-" + (date.getMonth() + 1).toString().padStart(2,'0') + "-" +  date.getDate().toString().padStart(2,'0')
        })
    };

    var responseBTP = await axios(btpOptions);
           // console.log(" --> OK:" + JSON.stringify(responseBTP.data));
    var results = responseBTP.data.value;
    }

    return "OK";

}

async function takeActivityItems(token){

    var btpServiceUrl = hostBTP + "/Activity_Items"
    var btpOptions = {
        method: "GET",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json',
        }
    };

    var responseBTP = await axios(btpOptions);
           // console.log(" --> OK:" + JSON.stringify(responseBTP.data));
    var results = responseBTP.data.value;

    return results;

}

async function deleteActvityItems(token,item){


    try {
        
     console.log("Sono nella delete della btp");   
    
    var btpServiceUrl = hostBTP + "/Activity_Items(worker_id='" + item.worker_id +"',idAbilitazione='"+ item.idAbilitazione + "')";
    var btpOptions = {
        method: "DELETE",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    };

    var responseBTP = await axios(btpOptions);
           // console.log(" --> OK:" + JSON.stringify(responseBTP.data));
    var results = responseBTP.data.value;
    

    return "OK";
    } catch (error) {
      console.log("ERRORE DELETE BTP:" + error);       
    }

}

async function updateManuallyItem(token,item){


    try {
        
     console.log("Sono nell'update della btp");   
    
    var btpServiceUrl = hostBTP + "/Activity_Items(worker_id='" + item.worker_id +"',idAbilitazione='"+ item.idAbilitazione + "')";
    var btpOptions = {
        method: "PATCH",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            "manually" : "X"
        })
    };


    var responseBTP = await axios(btpOptions);
           // console.log(" --> OK:" + JSON.stringify(responseBTP.data));
    var results = responseBTP.data.value;
        console.log("UPDATE CAMPO MANUALLY ACTIVITY_ITEM TABLE BTP:" );  

    return "OK";
    } catch (error) {
      console.log("ERRORE UPDATE CAMPO MANUALLY ACTIVITY_ITEM" );       
    }

}

async function takeSignedItems(token){
    

    var btpServiceUrl = hostBTP + "/Doc_firma_Inrete"
    var btpOptions = {
        method: "GET",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json',
        }
    };

    var responseBTP = await axios(btpOptions);
           console.log(" --> OK:" + JSON.stringify(responseBTP.data));
    var results = responseBTP.data.value;

    return results;

}

async function takeBase64(url){
    try {
        console.log("sono in takeBase64");
        var config = {
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                responseEncoding: 'binary',
                headers: {
                    "Content-Type": "application/pdf"
                }
            };
            const {data: pdf} = await axios(config);
            var base64 = Buffer.from(pdf).toString('base64');
            //console.log("in takeBase64 base64 is");
            //console.log(base64);

            return base64;
    }catch (error) {
    console.log("ERRORE nel takeBase64" );       
    }

}

async function updateSignedItems(token,id){

    try {
        
        console.log("Sono nell'update della btp - signed items");  
        
       var date = new Date();
       var sDate = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
       var btpServiceUrl = hostBTP + "/Doc_firma_Inrete('" + id +"')";
       var btpOptions = {
           method: "PATCH",
           url: btpServiceUrl,
           headers: {
               'Authorization': 'Bearer ' + token,
               'Content-Type': 'application/json'
           },
           data: JSON.stringify({
               "sent_fg" : "X",
               "data_sent" : sDate
           })
       };
   
   
       var responseBTP = await axios(btpOptions);
              // console.log(" --> OK:" + JSON.stringify(responseBTP.data));
       var results = responseBTP.data.value;
           console.log("UPDATE campi signed items" );  
   
       return "OK";
       } catch (error) {
         console.log("ERRORE UPDATE campi signed items" );       
       }


}

async function SaveActivityItems(btpToken,aWorkerID,abilitazione){

    try {
        
        console.log("Sono in SaveActivityItemsr");  
       var idAbilitazione = abilitazione + "_250";
       var date = new Date();
       var otimestamp = date.toISOString();
       var btpServiceUrl = hostBTP + "/Activity_Items";


       var btpOptions = {
           method: "POST",
           url: btpServiceUrl,
           headers: {
               'Authorization': 'Bearer ' + btpToken,
               'Content-Type': 'application/json'
           },
           data: JSON.stringify({
                "worker_id" : aWorkerID[i]["Worker ID"],
                "idAbilitazione" :  idAbilitazione,
                "data_scad": "",
                "data_doc" : "",
                "Doc_100": "",
                "time": otimestamp,
                "manually": ""
           })
       };
   
   
       var responseBTP = await axios(btpOptions);
              // console.log(" --> OK:" + JSON.stringify(responseBTP.data));
       var results = responseBTP.data.value;
           console.log("UPDATE campi signed items" );  
   
       return "OK";
       } catch (error) {
         console.log("ERRORE UPDATE campi signed items" );       
       }


}

function getToken(conf) {
    return axios(conf);
}



module.exports = {
    authBtp,
    takeAbAgNull,
    takeAbAgNotNull,
    takeAb,
    takeEmailAgenti,
    takeActivityItems,
    putFlagAbAg,
    deleteActvityItems,
    updateManuallyItem,
    takeSignedItems,
    takeBase64,
    updateSignedItems,
    SaveActivityItems
}