const express = require('express');

const PORT = process.env.PORT || 4559;

const bodyParser = require('body-parser');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;
const passport = require('passport');
const request = require('request');
const axios = require('axios');
const qs = require('qs');
const core = require('@sap-cloud-sdk/core');
const cfenv = require('cfenv');
const creds = require('service-credentials');
const _ = require('underscore');
const btpOperation = require('../BTP/btpOp');
const hostfg = "https://www.fieldglass.eu/api/vc/connector";
const hostPO = "http://rpp-wd.rfi.it";

async function authFG() {
    
    /*var appEnv = cfenv.getAppEnv();
    
    var credentials = creds.getCredentials('vert_scheduler_UPS');
    var FICredentials = JSON.parse(JSON.stringify(credentials));*/

    var fieldglassServiceTokenUrl = 'https://www.fieldglass.eu/api/oauth2/v2.0/token?grant_type=client_credentials&response_type=token';
    //var fieldglassUser = 'Service_PO_ERFI';
    //var fieldglassPassword = 'Almaviva1!';

    var buff = Buffer.from(fieldglassUser + ":" + fieldglassPassword, 'utf8');
    var fielglassBasicAuth = 'Basic ' + buff.toString('base64');

    // get bearer token from fieldglass
    var fieldglassConfig = {
        'method': 'POST',
        'url': fieldglassServiceTokenUrl,
        'headers': {
            'Authorization': fielglassBasicAuth
        }
    };

    var response = await getToken(fieldglassConfig);
    const fieldglassBearerToken = response.data.access_token;

    return fieldglassBearerToken;
}

async function authPO() {
    var credentials = creds.getCredentials('vert_scheduler_UPS');
    var POCredentials = JSON.parse(JSON.stringify(credentials));

    var POUser = POCredentials["PO_USER"]; 
    var POPassword = POCredentials["PO_PASSWORD"]; 


    var buff = Buffer.from(POUser + ":" + POPassword, 'utf8');
    var POBasicAuth = 'Basic ' + buff.toString('base64');


    return POBasicAuth;
}


async function _takeWorkerID(POsBearerAuth,cf,idAbilitazione){
    var POServiceUrl = hostPO + '/RESTAdapter/ActiveWorkOrderProfileWorkerDownload';

    var fieldglassOptions = {
        url: POServiceUrl,
        headers: {
            'Authorization': POsBearerAuth
        }
    };

    var response = await axios(fieldglassOptions);
    var afieldglassWorkerProfile = response.data.data;
    //console.log("WORKER ID ALL" + JSON.stringify(afieldglassWorkerProfile));
    var res  = _.where(afieldglassWorkerProfile, {"Security ID" : cf});
        res  = _.where(res, {"Job Code" : idAbilitazione});
        res = _.sortBy(res, "Worker ID").reverse();
                            //workerID = res.length > 0 ? res[0]["Worker ID"] : workerID;
    console.log("WORKER ID FOR CF" + JSON.stringify(res));

    return res;
}

async function addMilestone(POBearerToken,aWorkerID,idAbilitazione,type){

  var aType = type === 1 ? [300,400,450] : [500,550,600];
  var aObj = [];
  var date = new Date();

  for(var i = 0; i < aWorkerID.length; i++){
      aObj = [];
      for (var j = 0; j < aType.length; j++){
          aObj.push({
              "Completion Type": "",
              "Action": "",
              "Escalate after due date (days)": 0,
              "Usage": "Optional",
              "Description": "",
              "Due Days": 0,
              "Send work Items before due date (days)": 0,
              "Due Type": "",
              "Code": idAbilitazione + "_" + aType[j],
              "Modification Type": "A",
              "Type": "Activity",
              "Web Address": "",
              "Actor": "",
              "Due On Date": date.getFullYear() +  "-" + (date.getMonth() + 1).toString().padStart(2,'0') + "-" +  date.getDate().toString().padStart(2,'0'),
              "Worker ID": aWorkerID[i]["Worker ID"],
              "Emails": ""
          })
      }

      var data = JSON.stringify({
          "headers": {
            "Type": "WorkerActivityMilestoneItemUpload",
            "Comments": "",
            "Transaction": "True"
          },
          "data": aObj
        });

      var options = {
        method: 'post',
        url: hostPO + '/RESTAdapter/WorkerActivityMilestoneItemUpload',
        headers: { 
          'Authorization': POBearerToken, 
          'Content-Type': 'application/json', 
        },
        data : data
    }
      console.log(JSON.stringify(options))
      var response = await axios(options)
                      .then(function(response) {
                          //console.log(response.data);
                          console.log("WORKER ID: MILESTONE AGGIORNATE --> " +  aWorkerID[i]["Worker ID"]);
                      })
                      .catch(function(error) {
                          //console.log(error);
                          console.log("WORKER ID: MILESTONE GIA' AGGIORNATE --> " + aWorkerID[i]["Worker ID"]);
                      });
  }
}

async function activityCompletionItem(POBearerToken,workerID,idAbilitazione,DocType,data_scad, data_doc){
    
    try {
        var data;

        if(DocType === ""){
            data = JSON.stringify({
                "headers": {
                  "Type": "ActivityItemCompletionUpload",
                  "Date Format": "MM/DD/YYYY",
                  "Comments": "",
                  "Language": "",
                  "Transaction": "True",
                  "Buyer": "",
                  "Number Format": "#,##9.99 (Example: 1,234,567.99)"
                },
                "data": [
                  {
                    "Type": "Activity",
                    "Document Expiration Date": "05/12/2023",
                    "Profile Worker ID": workerID,
                    "Worker ID": workerID,
                    "Comments": "Check for Activity Item Completion Upload with Attachment by Madan",
                    "Completed by Username": "",
                    "Completion Date": "06/17/2022",
                    "Code": idAbilitazione,
                    "Due Date": "06/12/2022"
                  }
                ]
              });

        }else{
            data = JSON.stringify({
                "headers": {
                  "Type": "ActivityItemCompletionUpload",
                  "Date Format": "MM/DD/YYYY",
                  "Comments": "",
                  "Language": "",
                  "Transaction": "True",
                  "Buyer": "",
                  "Number Format": "#,##9.99 (Example: 1,234,567.99)"
                },
                "data": [
                  {
                    "Type": "Activity",
                    "Document Expiration Date": data_scad,
                    "Profile Worker ID": workerID,
                    "Worker ID": workerID,
                    "Comments": "Check for Activity Item Completion Upload with Attachment by Madan",
                    "Completed by Username": "",
                    "Completion Date": "06/17/2022",
                    "Code": idAbilitazione,
                    "Due Date": data_doc
                  },
                  {
                    "Type": "Activity",
                    "Document Expiration Date": "05/12/2023",
                    "Profile Worker ID": workerID,
                    "Worker ID": workerID,
                    "Comments": "Check for Activity Item Completion Upload with Attachment by Madan",
                    "Completed by Username": "",
                    "Completion Date": "06/17/2022",
                    "Code": DocType,
                    "Due Date": "06/12/2022"
                  }
                ]
              });

        }
    
      console.log("Payload chiamata FG: \n" + JSON.stringify(data))
      /*var config = {
        method: 'post',
        url: 'https://euxcore1.fgvms.eu/api/vc/connector/ActivityItemCompletionUpload',
        headers: { 
          'x-ApplicationKey': 'TRFI_9ERVL87TJKX4pnGSPUWWcq3DqTM', 
          'Authorization': 'Bearer ' + fieldglassBearerToken, 
          'Content-Type': 'application/json', 
        },
        data : data
      };*/
      var config = {
        method: 'post',
        url: hostPO + '/RESTAdapter/ActivityItemCompletionUpload',
        headers: { 
          'Authorization': POBearerToken, 
          'Content-Type': 'application/json', 
        },
        data : data
      };
      var bDelete = false;
      var response = await axios(config);
      if(response !== undefined){
        var ReturnCode = response.data !== undefined ? response.data.Status.ReturnCode : "400";
            if(ReturnCode !== "0"){
                console.log("chiamata axios return code !== 0");
                bDelete = false;
            }else{
                
                bDelete = true;
            }

      }

                    /* .then(function (response) {
                        console.log("Response nel then \n")
                        var ReturnCode = response.data.Status.ReturnCode; //response.Status.ReturnCode;
                        console.log("Return code: " + ReturnCode);
                            if(ReturnCode !== "0"){
                                console.log("chiamata axios return code !== 0");
                                return false;
                            }else{
                                var btpToken = await btpOperation.authBtp();
                                               await btpOperation.deleteActvityItems(btpToken,item);
                                return true;
                            }
                    })
                    .catch(function (error) {
                        console.log("Errore Activity item per workerID: \n" + workerID + "\n");
                        return false;
                        //console.log(error);
                    }); */
    
        return bDelete;
    } catch (error) {
        console.log("Errore Activity item per workerID: \n" + workerID + "\n");
         return false;   
    }
}

async function SaveDocumentsDirect(AuthPO,aWorkerID,abilitazione,UUID,base64){
    var idAbilitazione = abilitazione + "_250";
    var nomeFile = "AI_" + UUID + "_signed.pdf";
    var workerID = aWorkerID[i]["Worker ID"];

    try {
        var data = 
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<DocAttachments>\r\n   <DocumentObject>\r\n      <Module>Activity Item</Module>\r\n      <ObjectRef>" + workerID + "</ObjectRef>\r\n      <ExternalObjectRef>MyTestId</ExternalObjectRef>\r\n      <DetailItemReference>"+ idAbilitazione + "</DetailItemReference>\r\n      <Revision />\r\n      <Attachment>\r\n         <NonXMLContent>\r\n" +
    "<TextContent>"+base64+"</TextContent>\r\n            <SupportingInformation>\r\n               <Visibility>Public</Visibility>\r\n               <FileName>"+ nomeFile +"</FileName>\r\n               <Description>This is a test attachment by Madan</Description>\r\n            </SupportingInformation>\r\n         </NonXMLContent>\r\n      </Attachment>\r\n   </DocumentObject>\r\n</DocAttachments>";

   
      console.log("Payload chiamata FG: \n" + data)
     /* var config = {
        method: 'post',
        url: 'https://euxcore1.fgvms.eu/api/vc/connector/Attachments_TRFI',
        headers: { 
          'x-ApplicationKey': 'TRFI_9ERVL87TJKX4pnGSPUWWcq3DqTM', 
          'Authorization': 'Bearer ' + fieldglassBearerToken, 
          'Content-Type': 'application/xml', 
        },
        data : data
      };*/
     var config = {
        "url": hostPO + '/RESTAdapter/Attachments_TRFI',
        "method": method,
        "headers": {
          "x-ApplicationKey": "ERFI_LTfN5crs7n4Q4H4Wf9YhahWCT6n",
          'Authorization': AuthPO, 
          "Content-Type": "application/xml"
        },
        "data": data
      };
     
      
     /* var response = await core.executeHttpRequest(
        dest,
        { method: 'POST', url: '/RESTAdapter/Attachments_TRFI', data: data }
      ).then((response) => {
        resolve(response);
      }).catch((error) => {
        console.log('updateObject error', error);
        reject(error);
      });*/

      var bUpdate = false;
      var response = await axios(config);
      if(response !== undefined){
 
        bUpdate = true;
      }

        return bUpdate;
    } catch (error) {
        console.log("Errore save document per workerID: \n" + workerID + "\n");
         return false;   
    }
}

function getToken(conf) {
    return axios(conf);
}


module.exports = {
    authFG,
    authPO,
    _takeWorkerID,
    addMilestone,
    activityCompletionItem,
    SaveDocumentsDirect
} 