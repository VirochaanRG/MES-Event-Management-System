const express = require('express');
const app = express();
const cors = require('cors');
const port = 8080;

app.use(cors()); // allow all origins by default
app.use(express.json());

forms = [{formName : "CFES National Survey 2024", formId : 12345678, deadline: "2025-04-10", responses: 254}, {formName : "Event Requests", formId : 87654321, deadline: "", responses: 0}];

function genFormId() {
    return Math.floor(Math.random() * 89999999 + 10000000);
}

function getTodayDateString() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; 
    var yyyy = today.getFullYear();

    if (dd < 10) {
    dd = '0' + dd;
    }

    if (mm < 10) {
    mm = '0' + mm;
    } 
        
    return yyyy + '-' + mm + '-' + dd;
}
 
// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/available-forms', (req, res) => {
    res.json(forms);
    console.log(`sent forms`);
});

app.post('/create-form', (req, res) => {
    const data = req.body;
    newForm = {
        formName: data.formName,
        deadline: data.deadline,
        formId: genFormId(),
        responses : 0
    }
    forms.push(newForm);
    console.log(`received form`);
    res.json({ ok: true, received: newForm});
});

app.post('/respond-form', (req, res) => {
    var respondedFormId = req.body.formId;
    console.log(respondedFormId);
    for(var i = 0; i < forms.length; i++) {
        if(forms[i].formId == respondedFormId) {
            console.log(getTodayDateString());
            if(getTodayDateString() > forms[i].deadline && forms[i].deadline != '') {
                res.json({ ok: false, message : "Deadline has passed"});
                return;
            }
            forms[i].responses++;
            break;
        }
    }
    console.log(`received response`);
    res.json({ ok: true, message: "success"});
});

// Start the server
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});