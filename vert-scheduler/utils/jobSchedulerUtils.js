'use strict';
const xsenv = require('@sap/xsenv');
var request = require('request');
var jobScheduler = xsenv.getServices({
	scheduler: 'js_vert-scheduler'
});
const JobSchedulerClient = require('@sap/jobs-client');

async function _getToken() {

	return new Promise((resolve, reject) => {
		const jobSchedulerUaa = jobScheduler.scheduler.uaa;
		const jobSchedulerClientId = jobSchedulerUaa.clientid;
		const jobSchedulerClientSecret = jobSchedulerUaa.clientsecret;
		const jobSchedulerUaaUrl = jobSchedulerUaa.url + "/oauth/token";
		request.post({
			url: jobSchedulerUaaUrl,
			form: {
				grant_type: 'client_credentials',
				response_type: 'token',
				client_id: jobSchedulerClientId,
				client_secret: jobSchedulerClientSecret
			}
		}, function (err, httpResponse, body) {
			if (err) {
				reject(err);
			} else {
				resolve(JSON.parse(body).access_token);
			}
		});

	});
}

async function getJob(name) {
	const options = {
		baseURL: jobScheduler.scheduler.url,
		token: await _getToken()
	};
	const scheduler = new JobSchedulerClient.Scheduler(options);
	return new Promise((resolve, reject) => {
		var req = {
			name: name
		};
		scheduler.fetchJob(req, function (err, result) {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

async function updateJobLogStatus(headers,success,message) {
	const options = {
		baseURL: jobScheduler.scheduler.url,
		token: await _getToken()
	};
	const scheduler = new JobSchedulerClient.Scheduler(options);
	var jobId = headers['x-sap-job-id'],
		scheduleId = headers['x-sap-job-schedule-id'],
		runId = headers['x-sap-job-run-id'];

	var req = {
		jobId: jobId,
		scheduleId: scheduleId,
		runId: runId,
		data: {
			"success": success,
			"message": message
		}

	};

	return new Promise((resolve, reject) => {
	scheduler.updateJobRunLog(req, function(err, result) {
    if(err){
      console.log('Error updating run log: %s', err);
      reject(err);
    }else{
console.log("job updated succesfully");
 resolve(result);
    }
  });
		
	});
}

module.exports = {
	_getToken: _getToken,
	getJob: getJob,
	updateJobLogStatus: updateJobLogStatus
};
