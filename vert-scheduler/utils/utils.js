const bodyParser = require('body-parser');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;
const passport = require('passport');
const request = require('request');
const axios = require('axios');
const qs = require('qs');
const cfenv = require('cfenv');
const creds = require('service-credentials');
const _ = require('underscore');
const SapCfAxios = require('sap-cf-axios').default;


async function calculateManteinanceOrRenew(singleValidAgAb, aAbilitazioni) {

    var currentDate = new Date();
    var dateAb = new Date(singleValidAgAb.data_abil);
    var idAb = singleValidAgAb.id;
    var scadMaintenance = _.findWhere(aAbilitazioni, {"id" : idAb}) !== undefined ? _.findWhere(aAbilitazioni, {"id" : idAb}).scadenza_mantenimento : 0;
    var scadRenew = _.findWhere(aAbilitazioni, {"id" : idAb}) !== undefined ? _.findWhere(aAbilitazioni, {"id" : idAb}).scadenza_rinnovo : 0;
    var bMaintenance = dateAb.getFullYear() + scadMaintenance < currentDate.getFullYear() ? true : false;
    var bRenew =  dateAb.getFullYear() + scadRenew < currentDate.getFullYear() ? true : false;

    if(bRenew){
        return 2;
    }
    else if(bMaintenance){
        return 1;
    }

    return 0;

}

async function DestToken(dest_service, uaa_service,sUaaCredentials) {
    try {
        
       
        var data = qs.stringify({
            'client_id': dest_service.clientid,
            'grant_type': 'client_credentials'
        });
        var config = {
            method: 'post',
            url: uaa_service.url + '/oauth/token',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(sUaaCredentials).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        };
    
    
        
        var response = await axios(config);
        var res = response.data;
    
        // retrieve destination-configuration
        const token = JSON.parse(JSON.stringify(res)).access_token;
        const sDestinationName = 'PORTALE_RFI';
        var payload = {
            url: dest_service.uri + '/destination-configuration/v1/destinations/' + sDestinationName,
        headers: {
            'Authorization': 'Bearer ' + token
        }};
    
        var Response = await axios(payload);
        var res = Response.data;
        //console.log("res " + JSON.stringify(res));
        //console.log("token string type " + JSON.stringify(res.authTokens[0].type));

        //const destinationName = sDestinationName;
        const options = {
            method: 'GET',
            url: '/',
            //responseType: 'arraybuffer',
            //responseEncoding: 'binary',
            headers: {
                'Content-Type': 'application/pdf',
                
            }
        };
        const axiosCF = SapCfAxios(sDestinationName);
        //const {data: pdf} = await axiosCF(options);
        const responseCF = await axiosCF(options);

        /*const options = {
            method: 'GET',
            url: res.destinationConfiguration.URL + '/AI_6KTTABGOUR1P_signed.pdf',
            responseType: 'arraybuffer',
            responseEncoding: 'binary',
            headers: {
                'Content-Type': 'application/pdf',
                'Authorization': `${res.authTokens[0].type} ${res.authTokens[0].value}`
            }
        };*/

        
        /*const {data: pdf} = request(options,
            function (error, response, body) {
                if (error) {
                    console.error("httpRequests : error " + error.message);
                }
                if (response) {
                    let statusCode = response.status_code;
                    if (callback) {
                        callback(body);
                    }
                }
            }
        );*/
        //const {data: pdf} = await axios(options);
        //var base64 = Buffer.from(pdf).toString('base64');
          // console.log("in takeBase64 base64 is");
           console.log("response" + JSON.stringify(responseCF.data));

        
        
   

        return base64;

      
    } catch (error) {
        console.log(error.message);
        return error.message
    }
    

}

module.exports = {
	calculateManteinanceOrRenew,
    DestToken
};