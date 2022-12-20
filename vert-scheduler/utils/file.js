var axios = require('axios');
var data = JSON.stringify({
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
      "Document Expiration Date": "09/14/2025",
      "Profile Worker ID": "TRFIPW00000375",
      "Worker ID": "TRFIPW00000375",
      "Comments": "Check for Activity Item Completion Upload with Attachment by Madan",
      "Completed by Username": "",
      "Completion Date": "06/17/2022",
      "Code": "69220001_150",
      "Due Date": "09/15/2022"
    },
    {
      "Type": "Activity",
      "Document Expiration Date": "05/12/2023",
      "Profile Worker ID": "TRFIPW00000375",
      "Worker ID": "TRFIPW00000375",
      "Comments": "Check for Activity Item Completion Upload with Attachment by Madan",
      "Completed by Username": "",
      "Completion Date": "06/17/2022",
      "Code": "69220001_100",
      "Due Date": "06/12/2022"
    }
  ]
});
var config = {
  method: 'post',
  url: 'https://euxcore1.fgvms.eu/api/vc/connector/ActivityItemCompletionUpload',
  headers: { 
    'x-ApplicationKey': 'TRFI_9ERVL87TJKX4pnGSPUWWcq3DqTM', 
    'Authorization': 'Bearer YWVzQG9MRFVPamY1d3ByeGJYaG1zSkN5MHVmN0FFeitzMm9oT0o2clA4VDAvcmI2cE90ejRDQTlmYWE1cUtpWHFBb0ZkY3RHTDJUVnRYWm9CZDlHa3dMUnR1b3lrbFlaOUMxVVJScndGeGtqTi9tMys3dW5CMCtBOXJjaVQ5d1NCZDVSVCtrTENYcEpKRlEwNGNDK3dFMVJ2QnpXcmluUGZYclNkSnc3QlBFSzdVZz0=', 
    'Content-Type': 'application/json', 
    'Cookie': 'SAPFG=!7vdvhYovYtoL+FeuBgBc22Ye9LiofgC9FdQWRmFTNY32Pjj/iRl/AylvxEEMJVvNwYNpDWsUPnofDw==; JSESSIONID=0CEC05E83428285009F55A904BC520F7; TS011f74b3=0185aad4f6ef2a0c080eca9af2b5c628d2810d823b41478e79513bbe8f99189bc48d5fb91e61fe3b06784914baf280f4b310b47dd0c6e75d040f3d4c2a8b745cd8354cddcb32a6e065fd5a07f451b24db72434df13'
  },
  data : data
};
axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
});