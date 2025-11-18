const server = 'http://localhost:8080/';
const currentFormsDiv = document.getElementById("current-forms");

function setMinDeadlineDateAsToday() {
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
        
    today = yyyy + '-' + mm + '-' + dd;
    document.getElementById("deadline").setAttribute("min", today);
}

function createFormDiv(formData) {
    const formTitleH3 = document.createElement("h3");
    formTitleH3.innerHTML = formData.formName;
    const formIdP = document.createElement("p");
    formIdP.innerHTML = "ID: " + formData.formId;
    const formDeadlineP = document.createElement("p");
    if(formData.deadline == '') {
        formDeadlineP.innerHTML = "Deadline: None";
    }
    else {
        formDeadlineP.innerHTML = "Deadline: " + formData.deadline;
    }
    const respondButton = document.createElement("button");
    respondButton.innerHTML = "Submit Response";
    respondButton.addEventListener("click", function() {
        fetch(server + "respond-form", {
            method: "POST",
            headers: { "Content-type" : 'application/json; charset=UTF-8'},
            body: JSON.stringify({formId : formData.formId})
        }).then(res => res.json())
        .then(data => {
            console.log(data);
            if(data.ok) {
                alert("Your reponse was received");
            } else {
                alert("ERROR: " + data.message);
            }
        });
    });

    const formDiv = document.createElement("div");
    formDiv.appendChild(formTitleH3);
    //formDiv.appendChild(document.createElement("br"));
    formDiv.appendChild(formIdP);
    //formDiv.appendChild(document.createElement("br"));
    formDiv.appendChild(formDeadlineP);
    formDiv.appendChild(respondButton);
    formDiv.style.border = "1px solid black";
    formDiv.style.width = "50%";
    formDiv.style.padding = "8px";
    return formDiv;
}

fetch(server + "available-forms") //get forms from server
.then(response => response.json())
.then(forms => {
    if (forms.length > 0) currentFormsDiv.innerHTML = ''; 
    for(var i = 0; i < forms.length; i++) {
        const formDiv = createFormDiv(forms[i]);
        currentFormsDiv.appendChild(formDiv);
        currentFormsDiv.appendChild(document.createElement("br"));
    }
})