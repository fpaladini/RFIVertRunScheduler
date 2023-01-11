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
const _ = require('underscore');
const creds = require('service-credentials');
const btpOperation = require('./BTP/btpOp');
const litmosOperation = require('./LITMOS/litmosOp');
const fgOperation = require('./FG/fgOp');
const jobSchedulerUtils = require('./utils/jobSchedulerUtils');
const utility = require('./utils/utils');
const hostBTP = "https://fstech-infr-ferr-prd-vert-verticale-esterni-srv.cfapps.eu10.hana.ondemand.com/catalog";
const hostPO = " http://rpp-wd.rfi.it";
const hostLitmos = "https://fsacademy-prod.litmoseu.com/v1.svc";

const xsuaaCredentials = xsenv.getServices({
    uaa: {
        tag: 'xsuaa'
    }
}).uaa;


const REQ_SCOPE = xsuaaCredentials.xsappname + '.JOBSCHEDULER';
//const REQ_SCOPE = xsuaaCredentials.xsappname + '.ReferenteRFI';

passport.use(new JWTStrategy(xsuaaCredentials));

const app = express();
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.authenticate('JWT', {
    session: false
}));


function scopeCheckMiddleware(req, res, next) {
    if (req.authInfo.checkScope(REQ_SCOPE)) {
        return next();
    }
    return res.status(403).json({
        error: 'Not Authorized',
        message: 'Scope not found'
    });
}

app.get('/', function (req, res) {
    res.status(200).json({
        message: 'Vert Scheduler'
    });
});


app.get('/health_status', function (req, res) {
    let memUsage = process.memoryUsage();
   
    res.status(200).json({
        status: 'healthy',
        memory_usage: memUsage
    });
    const dest_service = xsenv.getServices({ dest: { tag: 'destination' } }).dest;
    console.log(dest_service);
});

app.get('/destination', async (req, res) => {
    //const rp = require('request-promise');
    const dest_service = xsenv.getServices({ dest: { tag: 'destination' } }).dest;
    const uaa_service = xsenv.getServices({ uaa: { tag: 'xsuaa' } }).uaa;
    const sUaaCredentials = dest_service.clientid + ':' + dest_service.clientsecret;
    const sDestinationName = 'Fieldglass_DEST';

    //console.log("sUaaCredentials",sUaaCredentials);

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
    
    
        //console.log(config);
        var response = await axios(config);
        var data = response.data;

        console.log("data", data);
    
    
        // retrieve destination-configuration
        //const token = JSON.parse(data).access_token;

        //console.log("token",token);
        //console.log("zzzz", dest_service.uri + '/destination-configuration/v1/destinations/' + sDestinationName);

        /* var config = {
            url: dest_service.uri + '/destination-configuration/v1/destinations/' + sDestinationName,
        headers: {
            'Authorization': 'Bearer ' + token
        }};*/


        console.log("config",config);

        //var response = await axios(config);
        //console.log("resp",response);
        //var data = response.data;

        //console.log("data", data);


    
        res.send({ "result": "OK" });
      
    } catch (error) {
        console.log(error.message);
        res.send({ "result": error });
    }

});


/***** API FIELDGLASS AGGIUNTA DITTE *****/
app.get('/aggiunginuoveditte', scopeCheckMiddleware, async function (req, res) {
  
   var fieldglassServiceUrl = hostPO + '/RESTAdapter/SupplierDetailDownload';
   var AuthPO = await fgOperation.authPO();

   // get ditte from Fieldglass

   var fieldglassOptions = {
    url: fieldglassServiceUrl,
    method: "GET",
    headers: {
        'x-ApplicationKey': 'ERFI_LTfN5crs7n4Q4H4Wf9YhahWCT6n',
        'Accept': 'application/json',
        'Authorization': AuthPO,
    }
};

   var response = await getDitteFromFieldglass(fieldglassOptions);
   const fieldglassDitte = response.data.data;

   console.log("fieldglassDitte");
   console.log(fieldglassDitte);

   var vec = [];
   var arrResult = [];
   try {
       await Promise.all(fieldglassDitte.map(async (fieldglassDitta) => {
           // write ditte to BTP
           var newFielglassDitta = {
               "cod_forn": fieldglassDitta["Vendor ID"],
               "nome_ditta": fieldglassDitta["Supplier Name"],
               "status": fieldglassDitta["Status"],
               "cod_fg": fieldglassDitta["Supplier Code"]
           };

           var btpToken = await btpOperation.authBtp();
           var btpServiceUrl = hostBTP + "/Ditte";
           var btpOptions = {
               method: "post",
               url: btpServiceUrl,
               headers: {
                   'Authorization': 'Bearer ' + btpToken,
                   'Content-Type': 'application/json',
               },
               data:
                   JSON.stringify(newFielglassDitta)
           };
         
           try {
           var response = await axios(btpOptions);
               console.log(fieldglassDitta["Supplier Name"] + " --> OK:" + response);
               arrResult.push({"EsitoBTP": fieldglassDitta["Supplier Name"] + " --> OK:" + response});
           } catch (error) {
               console.log(fieldglassDitta["Supplier Name"] + " --> KO:" + error);    
               arrResult.push({"EsitoBTP": fieldglassDitta["Supplier Name"] + " --> KO:" + error});
           }
           
           vec.push(newFielglassDitta);
       }));
           
       res.status(200).json({ result: arrResult });
   } catch (error) {
       res.status(error.status).json({ result: [] });
   } 

});



/***** API FIELDGLASS DELTA AGGIUNTA DITTE *****/
app.get('/aggiunginuoveditteDelta', scopeCheckMiddleware, async function (req, res) {
   var fieldglassServiceUrl = hostPO + '/RESTAdapter/SupplierDownload';
    var AuthPO = await fgOperation.authPO();
 
    // get ditte from Fieldglass
    var fieldglassOptions = {
        url: fieldglassServiceUrl,
        method: "GET",
        headers: {
            'x-ApplicationKey': 'ERFI_LTfN5crs7n4Q4H4Wf9YhahWCT6n',
            'Accept': 'application/json',
            'Authorization': AuthPO,
        }
    };

    var response = await getDitteFromFieldglass(fieldglassOptions);
    const fieldglassDitte = response.data.data;
    
    console.log("Ditte presenti ultima chiamata Delta:" + JSON.stringify(response.data));

    console.log("fieldglassDitte");
    console.log(fieldglassDitte);

    

    var vec = [];
    var arrResult = [];
    try {
        await Promise.all(fieldglassDitte.map(async (fieldglassDitta) => {
            // write ditte to BTP
            var newFielglassDitta = {
                "cod_forn": fieldglassDitta["Vendor ID"],
                "nome_ditta": fieldglassDitta["Supplier Name"],
                "status": fieldglassDitta["Status"],
                "cod_fg": fieldglassDitta["Supplier Code"]
            };
            var btpToken = await btpOperation.authBtp();
            var btpServiceUrl = hostBTP + "/Ditte";
            var btpOptions = {
                method: "post",
                url: btpServiceUrl,
                headers: {
                    'Authorization': 'Bearer ' + btpToken,
                    'Content-Type': 'application/json',
                },
                data:
                    JSON.stringify(newFielglassDitta)
            };
            
    
            try {
                var response = await axios(btpOptions);
                    console.log(fieldglassDitta["Supplier Name"] + " --> OK:" + response);
                    arrResult.push({"EsitoBTP": fieldglassDitta["Supplier Name"] + " --> OK:" + response});
                } catch (error) {
                    console.log(fieldglassDitta["Supplier Name"] + " --> KO:" + error);    
                    arrResult.push({"EsitoBTP": fieldglassDitta["Supplier Name"] + " --> KO:" + error});
                }
            vec.push(newFielglassDitta);
        }));
            
        res.status(200).json({ result: arrResult });
    } catch (error) {
        res.send(error);
    }

});



/***** API FIELDGLASS ACTIVITY COMPLETION ITEM *****/
app.get('/activityCompletionItem', scopeCheckMiddleware, async function (req, res) {
    
    try {
        
    
    var btpToken = await btpOperation.authBtp();
    var aActivityItems = await btpOperation.takeActivityItems(btpToken);
    var currentDate = new Date();

        for(var i = 0; i < aActivityItems.length; i++){
            var item = aActivityItems[i];
            var AuthPO = await fgOperation.authPO();
            console.log("Orario corrente in ms " + currentDate.getTime());
            console.log("Orario item in ms " + new Date(item.time).getTime());
            if(currentDate.getTime() > new Date(item.time).getTime() + 600000){
            var bManually =  currentDate.getTime() > new Date(item.time).getTime() + 86400000 || item.manually === 'X' ? true : false   
                if(!bManually){
                    var bDelete = await fgOperation.activityCompletionItem(AuthPO,item.worker_id,item.idAbilitazione,item.Doc_100,item.data_scad, item.data_doc);
                    console.log("Return code da fieldglass per workerID " + item.worker_id + "delete:" + bDelete);

                        if(bDelete){
                            btpToken = await btpOperation.authBtp();
                            await btpOperation.deleteActvityItems(btpToken,item);
                        }
                        
                }
                else{
                    btpToken = await btpOperation.authBtp();
                    await btpOperation.updateManuallyItem(btpToken,item);
                }
             
            }
        }
            
        await jobSchedulerUtils.updateJobLogStatus(req.headers, true, JSON.stringify({ result: "Job Finito" }) );
     
    } catch (error) {

        console.log("ERRORE",error);      
        await jobSchedulerUtils.updateJobLogStatus(req.headers, false, "Procedure executed with errors" + JSON.stringify(error)); 
    }
        
    

});

/***** AGGIUNTA DITTE DA DB HANA VERSO LITMOS TRAMITE API *****/
app.get('/aggiungiDitteLitmos', scopeCheckMiddleware, async function (req, res) {

    try{
    
    console.log('\x1b[34m', "AGGIUNTA DITTE DA DB HANA VERSO LITMOS TRAMITE API");
    console.log('"\x1b[30m"', "-----------------------")

    var btpToken = await btpOperation.authBtp();
    var btpServiceUrl = hostBTP + "/Ditte";

    var btpOptions = {
        method: "GET",
        url: btpServiceUrl,
        headers: {
            'Authorization': 'Bearer ' + btpToken,
            'Accept': 'application/json',
        }
    };
    var arrResult = [];

    try {
        var responseBTP = await axios(btpOptions);
            console.log(" --> OK:" + JSON.stringify(responseBTP.data));
        var results = responseBTP.data.value;

        for (var i = 0; i < results.length; i++) {
            console.log("Inserimento Ditta:" + JSON.stringify(results[i]));
            var xml = '<Team><Name>'+ results[i].nome_ditta +'</Name><Description>'+ results[i].nome_ditta +'</Description><ParentTeamId>6_eWFc6K2mo1</ParentTeamId></Team>';
            var AuthPO = await fgOperation.authPO();
            console.log("XML: " + xml);
  
            axios({
                method: 'POST',
                url: hostPO + '/RESTAdapter/CreateTeams',
                data: xml,
                headers: {
                    'Authorization': AuthPO,
                    'Content-Type': 'application/xml',
                },
            })
            .then(function(response) {
                console.log("res: " + JSON.stringify(response.data));
                arrResult.push({"EsitoLitmos": "OK --> " + xml});
            })
            .catch(function(error) {
                console.log("err" + JSON.stringify(error));
                arrResult.push({"EsitoLitmos": "KO --> " + xml});
            });
        }
            
        } catch (error) {
            console.log(" --> KO:" + error);    
        }
        res.status(200).json({ result: arrResult });

    } catch (error) {
        res.send(error);
    }

})



/***** LITMOS TAKE ACHIEVEMENTS *****/
app.get('/getAchievements', scopeCheckMiddleware, async function (req, res) {

    try {
        
    res.status(202).send('Accepted async job, but long-running operation still running.')
    var btpToken = await btpOperation.authBtp();
    var AuthPO = await fgOperation.authPO();
    var abAgentiNull = await btpOperation.takeAbAgNull(btpToken);
    var emails = await btpOperation.takeEmailAgenti(btpToken,abAgentiNull);
       // emails = _.uniq(emails,"email");
    //console.log("Mail da esplorare: \n" + JSON.stringify(emails));
    var users = await litmosOperation.litmosUsersFromMail(emails,AuthPO);
    console.log("Id Utenti: \n" + JSON.stringify(users));
    var usersFinal = await litmosOperation.litmosUsersCourses(users,AuthPO);
    console.log("Final Users: " + JSON.stringify(usersFinal));
        usersFinal = _.where(usersFinal, {"AllCompleted":true});
    
    var final = await btpOperation.putFlagAbAg(btpToken,usersFinal);
    await jobSchedulerUtils.updateJobLogStatus(req.headers, true, JSON.stringify({ result: JSON.stringify(usersFinal) }));
            
    //res.status(200).json({ result: JSON.stringify(usersFinal) });

    } catch (error) {
     console.log("ERRORE",error);      
     await jobSchedulerUtils.updateJobLogStatus(req.headers, false, "Procedure executed with errors" + JSON.stringify(error)); 
    }
})

/***** FIELDGLASS UPDATE MILESTONE *****/
app.get('/updateMilestone', scopeCheckMiddleware, async function (req, res) {

    try {
        
    res.status(202).send('Accepted async job, but long-running operation still running.')
    var btpToken = await btpOperation.authBtp();
    var AuthPO = await fgOperation.authPO();
    var aValidAb = await btpOperation.takeAbAgNotNull(btpToken);
    var aAbilitazioni = await btpOperation.takeAb(btpToken);
    var emails = await btpOperation.takeEmailAgenti(btpToken,aValidAb);
    var users = await litmosOperation.litmosUsersFromMail(emails,AuthPO);
    var itemsFinal = await litmosOperation.litmosUsersCourses(users,AuthPO);
    //var fgToken = await fgOperation.authFG();
    
    var arr = [];
    
    
    for(var i = 0; i < aValidAb.length; i++){
        var itemsFinalFilteredCF = _.where(itemsFinal, {CF : aValidAb[i].cod_fisc}) ;
        console.log("itemsFinalFilteredCF " + JSON.stringify(itemsFinalFilteredCF));
        var bContinue = _.findWhere(itemsFinalFilteredCF, {ID_ABILITAZIONE : aValidAb[i].id}) !== undefined ? _.findWhere(itemsFinalFilteredCF, {ID_ABILITAZIONE : aValidAb[i].id}).AllCompleted : false;
        console.log("bContinue " + bContinue);   
        if(bContinue){
            var iAdd = await utility.calculateManteinanceOrRenew(aValidAb[i],aAbilitazioni); // if return 0 No update, return 1 update maintenance, return 2 update renew
            var obj = { IdAbilitazione : aValidAb[i].id, CodiceFiscale: aValidAb[i].cod_fisc, Tipologia: iAdd }
            
            if(iAdd !== 0){
                var aWorkerID = await fgOperation._takeWorkerID(AuthPO,aValidAb[i].cod_fisc,aValidAb[i].id);

                console.log("WORKER ID FOR CF IN SERVERJS" + JSON.stringify(aWorkerID));
                await fgOperation.addMilestone(AuthPO,aWorkerID,aValidAb[i].id,iAdd)
            }
            arr.push(obj)
        }
    }


    await jobSchedulerUtils.updateJobLogStatus(req.headers, true, JSON.stringify({ result: JSON.stringify(arr) }) );
     
    } catch (error) {
     console.log("ERRORE",error);      
     await jobSchedulerUtils.updateJobLogStatus(req.headers, false, "Procedure executed with errors" + JSON.stringify(error)); 
    }
})

app.get('/updateSignedDocument', scopeCheckMiddleware, async function (req, res) {


    try {
        
    console.log('\x1b[34m', "sono in FIELDGLASS UPDATE SIGNED DOCUMENTI");

    const dest_service = xsenv.getServices({ dest: { tag: 'destination' } }).dest;
    const uaa_service = xsenv.getServices({ uaa: { tag: 'xsuaa' } }).uaa;
    const sUaaCredentials = dest_service.clientid + ':' + dest_service.clientsecret;
    
    console.log("sUaaCredentials : " + sUaaCredentials + "url " + uaa_service.url);

    var DestToken = await utility.DestToken(dest_service,uaa_service,sUaaCredentials);
    console.log("DestToken: " + DestToken);


    
    

    var btpToken = await btpOperation.authBtp();
    var aSignedItems = await btpOperation.takeSignedItems(btpToken);
    var arr = [];


        for(var i = 0; i < aSignedItems.length; i++){
            var item = aSignedItems[i];
            if(item.URL_FIRMATO !== ""){

                var AuthPO = await fgOperation.authPO();
                var AuthCC = await btpOperation.authCC();
                //var base64 = await btpOperation.takeBase64(item.URL_FIRMATO);
                var base64 = await btpOperation.takeBase64(AuthCC,item.URL_FIRMATO);
                console.log("base64: " + JSON.stringify(base64));
                var aWorkerID = await fgOperation._takeWorkerID(AuthPO,item.cod_fiscale,item.abilitazione);
                console.log("WORKER ID FOR SIGNED DOCUMENTS" + JSON.stringify(aWorkerID));
                var bUpdate = await fgOperation.SaveDocumentsDirect(AuthPO,aWorkerID,item.abilitazione,item.UUID,base64);
                console.log("Return code da fieldglass per workerID " + aWorkerID[i]["Worker ID"] + "update:" + bUpdate);
                var obj = { IdAbilitazione : item.abilitazione + "_250", WorkerID: aWorkerID[i]["Worker ID"], Update: bUpdate};
                if(bUpdate){
                    
                    await btpOperation.updateSignedItems(btpToken,item.UUID);
                    await btpOperation.SaveActivityItems(btpToken,aWorkerID,item.abilitazione);
                }
                arr.push(obj)
            }

        }
        await jobSchedulerUtils.updateJobLogStatus(req.headers, true, JSON.stringify({ result: JSON.stringify(arr) }) );
     
    } catch (error) {

        console.log("ERRORE",error);      
        await jobSchedulerUtils.updateJobLogStatus(req.headers, false, "Procedure executed with errors" + JSON.stringify(error)); 
    }
        
    

});



function getToken(conf) {
    return axios(conf);
}

function getDitteFromFieldglass(options) {
    return axios(options);
}