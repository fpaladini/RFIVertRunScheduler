const express = require('express');

const PORT = process.env.PORT || 4559;

const bodyParser = require('body-parser');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;
const passport = require('passport');
const request = require('request');
const axios = require('axios');
const qs = require('qs');
const X2JS = require('x2js');
const _ = require('underscore');
const parseString = require('xml2js').parseString;
const cfenv = require('cfenv');
const creds = require('service-credentials');
const hostLitmos = "https://api.litmoseu.com/v1.svc";
const hostPO = " http://lxq-wd.fslogistica.it";

async function litmosUsersFromMail(emails,AuthPO){
    console.log("SONO IN litmosUsersFromMail");
    console.log("AuthPO " + AuthPO);
    var arr = [];
    var usersID = [];
    var results = null;
    console.log("url --> " + hostPO + '/RESTAdapter/GetListOfUsers?search='+ emails[0].email);
    for(var i=0; i < emails.length; i++){
        console.log("Email --> " + emails[i].email);
        var cf = emails[i].cod_fisc;
        var idAbil = emails[i].id_abil;
        
        await axios({ 
            method: 'get',
            url: hostPO + '/RESTAdapter/GetListOfUsers?search='+ emails[i].email,//hostLitmos + '/users?=&source=fsacademytest&limit=1000&search=' + emails[i].email,
            headers: {
                "Authorization": AuthPO,
            }
            /*method: 'get',
            url: hostLitmos + '/users?=&source=fsacademytest&limit=1000&search=' + emails[i].email,//'http://lxq-wd.fslogistica.it/RESTAdapter/GetListOfUsers?search='+ emails[i].email
            headers: {
                'Accept': 'application/json',
                "apikey": "3a2e541d-e084-411c-9968-fda564dc039d"
            }*/
            })
            .then(function (response) {
                console.log("Response della mail : " + JSON.stringify(response.data) );
                results = response.data !== undefined ? response.data : [];
              /*  
                for(var j = 0; j <results.length; j++){
                    usersID.push({userID: results[j].Id, cod_fisc: cf, id_abil: idAbil});
                }*/
                if(results !== []){
                    var xml = response.data
                    var x2js = new X2JS();
                    var json = x2js.xml2js(xml);
                    var result = json['Users'].User;
                    var obj = JSON.parse(JSON.stringify(result));
                    //obj = response.data !== undefined ? response.data : [];

                    //if(obj.length === undefined){
                        usersID.push({userID: obj.Id, cod_fisc: cf, id_abil: idAbil});
                   /* }else{
                        for(var j = 0; j <obj.length; j++){
                            usersID.push({userID: obj[j].Id, cod_fisc: cf, id_abil: idAbil});
                       }
                    }*/
                }
            })
            .catch(function (error) {
                console.log("KO");
            });
    }
    return usersID;
    

    
}

async function litmosUsersCourses(users,AuthPO){

    var usersFinal = [];
    for(var i=0; i < users.length; i++){
   
    var user = users[i].userID;    
    var cf = users[i].cod_fisc;
    var idAbil = users[i].id_abil;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    await delay(5000); /// waiting 2 seconds.
    await axios({
            method: 'GET',
            url: hostPO + '/RESTAdapter/AssignCoursesToUser/' + user, //'https://api.litmoseu.com/v1.svc/users/' + user + '/courses?&source=fsacademytest',
            headers: {
                "Authorization": AuthPO,
                "Content-Type": "application/xml",
            },
           /* headers: {

                'Accept': 'application/json',
                "apikey": "203ad0a3-1e4d-4b96-9b34-0acfe3020c69"
            },*/
        }).then(function (response) {
            //console.log("RISPOSTA LITMOS USER/COURSE:" + user + " ---- " + JSON.stringify(response.data));
            //var results = response.data;

            var xml = response.data
            var x2js = new X2JS();
            var json = x2js.xml2js(xml);
            var result = json['Courses'].Course;
            var obj = JSON.parse(JSON.stringify(result));

            var bAllCompleted = obj.length > 0 ? true : false;
            for(var i = 0; i< obj.length; i++){
                var item = obj[i];
                if(item.Complete === "false"){
                    bAllCompleted = false;
                }
            }


           /*var bAllCompleted = results.length > 0 ? true : false;
            for(var i = 0; i< results.length; i++){
                if(!results[i].Complete){
                    bAllCompleted = false;
                }
            }*/

            usersFinal.push({
                "Id" : user,
                "AllCompleted" : bAllCompleted,
                "CF": cf,
                "ID_ABILITAZIONE": idAbil
            }); 
          })
          .catch(function (error) {
            console.log("ERRORE PER USER: " + user);
          });

        
            
    }

    return usersFinal;
}


async function _onGetTeamsLitmos(POBearerToken){

    var results="";
    await axios({
        method: 'get',
        url: hostPO + '/RESTAdapter/CreateTeams',
        headers: {
            'Authorization': POBearerToken,
            'accept' : 'application/json'
        }
        })
        .then(function (response) {

            var xml = response.data
            var x2js = new X2JS();
            var json = x2js.xml2js(xml);
            var result = json['Teams'].Team;
            console.log("ditta : " + JSON.stringify(result));
            var obj = JSON.parse(JSON.stringify(result));
            var idDitta = _.where(obj, {Name: "Almaviva"})[0].Id;
            console.log("ditta : " + JSON.stringify(idDitta));
            
           
        })
        .catch(function (error) {
            console.log('errore: ' + error);
        });

    return results;
}

module.exports = {
    litmosUsersFromMail,
    litmosUsersCourses,
    _onGetTeamsLitmos
} 
