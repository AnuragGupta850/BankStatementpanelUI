import { LightningElement,track } from 'lwc';
import getOriginList from '@salesforce/apex/bankStatementControl_lwc.getOriginList';
import getActiveEmploymentStatus from '@salesforce/apex/bankStatementControl_lwc.getActiveEmploymentStatus';
import DeployUpdatedMetaData from '@salesforce/apex/bankStatementControl_lwc.DeployUpdatedMetaData';


import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class BankStatementsControl extends LightningElement {


    @track OriginList = [];
    @track SelectedOrigin;
    finalJson;
    @track employmentOptions = [];
    @track filterOptions = [];
    @track OverflowFilter;
    @track renderOptions = false;
    // debug Enable/Disable
    @track debug = true;
    @track parsedEmploymentOptions;
    @track jsonifiedEmpSts;
    @track jsonifiedfilter;
    showSpinner;
    MetadataURL;
    @track displayTabTemplate = {bankstatements:true, leadfilter:false, options:false};
    @track disableButton = {update:true, redirect:true, connectedCall:false };
    
    showLogs(message) {
        if (this.debug) {
           console.log(message);
        }
        else {
           return;
        }
     }

    connectedCallback()
    {

        this.showLogs('connectedCallback');
        this.showSpinner = true;
        getOriginList()
        .then(result => {               
            let response = JSON.parse(result);
            var isSuccess = response.isSuccess;  
            this.showLogs({'Response':response});   
            this.showLogs({'isSuccess':isSuccess,'Type':'Get Origin List'});    
            if(isSuccess){            
              
               for(let i = 0; i < response.originList.length; i++)
                {
                    this.OriginList.push({value:response.originList[i], key:response.originList[i]}); 
                } 

            }
            else if(!isSuccess){
                // this.showLogs({'isSuccess else':isSuccess});
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Warning!",
                        message: "The Origin List Fetch Failed:"+response.error,
                        variant: "warning"
                    })
                );
            }
            this.showSpinner = false;             
        })
        .catch(error => {           
            // console.error('This is error pushToLM:'+error); 
            this.showSpinner = false;     
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Error!",
                    message: "Something went wrong! Error:"+error.body,
                    variant: "error"
                })
            );     
        });  
        
        
    }

    changeOrigin(event)
    {
        this.showSpinner = true; 
        this.employmentOptions.length = 0;
        this.showLogs(event.target.value);
        this.SelectedOrigin = event.target.value;

        if(this.SelectedOrigin == 'None'){ 
            this.renderOptions = false; 
            this.disableButton.redirect = true;
            this.disableButton.update = true;  
            this.showSpinner = false; 
            return;
        }

        getActiveEmploymentStatus({'origin':this.SelectedOrigin})
        .then(result => {               
            let response = JSON.parse(result);
            var isSuccess = response.isSuccess;  
            this.showLogs({'Response':response});   
            this.showLogs({'isSuccess':isSuccess,'Type':'getActiveEmploymentStatus'});    
            if(isSuccess){           
                this.MetadataURL = response.RecordId;                                        
                this.renderOptions = true;                
                this.disableButton.redirect = false;
                this.disableButton.update = false; 
                this.displayTabTemplate.options = true;
                
                const empStsMap = new Map(Object.entries(response.employment_status));
                for (const [key_m, value_m] of empStsMap) {
                    this.showLogs(key_m, value_m);
                    this.employmentOptions.push({value:value_m, key:key_m}); 
                    }
                this.parsedEmploymentOptions = response;
                this.jsonifiedEmpSts = new Map(Object.entries(this.parsedEmploymentOptions.employment_status));
                //this.OverflowFilter = response.OverflowFilter;
                //this.showLogs('Before OverflowFilter'+ this.OverflowFilter);
                const filterMap = new Map(Object.entries(response.allfilters));
                for (const [key_m, value_m] of filterMap) {
                    this.showLogs(key_m, value_m);
                    this.filterOptions.push({value:value_m, key:key_m}); 
                    }
                this.jsonifiedfilter = new Map(Object.entries(this.parsedEmploymentOptions.allfilters));    
                
            }
            else if(!isSuccess){
                // this.showLogs({'isSuccess else':isSuccess});
                this.renderOptions = false;                
                this.disableButton.redirect = true;
                this.disableButton.update = true;  
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Warning!",
                        message: "The Active Employment Fetch Failed:"+response.error,
                        variant: "warning"
                    })
                );
            }  
            this.showSpinner = false;
         
        })
        .catch(error => {           
            // console.error('This is error pushToLM:'+error);    
            this.showSpinner = false;

            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Error!",
                    message: "Something went wrong! Error:"+error.body,
                    variant: "error"
                })
            );     
        }); 


    }


    getActiveEmpState(event)
    {

        this.showSpinner = true;
        //this.showLogs(event.target.value);
        var type = event.target.name;
        console.log(type);

        var totalMap = {};
        

        if(type == 'empStatusval'){

        this.finalJson = new Map(Object.entries({'origin':this.SelectedOrigin, 'employment_status':this.jsonifiedEmpSts, 'type':'empstatusval'}));
           
        this.showLogs('update button jsonifiedEmpSts'+this.finalJson);
        this.showLogs('Stringfy jsonifiedEmpSts'+JSON.stringify(this.finalJson));

        
        const totalEmp = Object.fromEntries(this.jsonifiedEmpSts);

         totalMap = {'origin':this.SelectedOrigin, 'employment_status':totalEmp, 'type':'empstatusval'};

        this.showLogs('totalMap'+totalMap);
        }
        
        else if(type == 'Filterval'){

            const totalfilter = Object.fromEntries(this.jsonifiedfilter);
            console.log('totalfilter---->',totalfilter);

            //const totalfilter = {'overflowfilter':this.OverflowFilter};

         totalMap = {'origin':this.SelectedOrigin,'filters':totalfilter, 'type':'filterval'};
        }

        DeployUpdatedMetaData({'rootMap':totalMap})
        .then(result => {               
            let response = JSON.parse(result);
            this.showLogs({'response':response});
            this.showLogs({'Deployed with JOB ID':response.DeploymentId});

           // var isSuccess = response.isSuccess;  
            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Success!",
                    message: "Metadata deployment in Progress..Please wait!",
                    variant: "success"
                })
            );    
             //Refersh UI
             setTimeout(() => {
                this.showSpinner = true;
                this.refreshUI();
            }, 5000);
            //

        })
        .catch(error => {           
            console.error('This is error update:',error);    
           // this.showSpinner = false;

            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Error!",
                    message: "Update Meta Data - Something went wrong! Error:"+error.body,
                    variant: "error"
                })
            );     
        }); 

       
    }

    async refreshUI(){

        this.showLogs('ASync refresh');
        
        this.employmentOptions.length = 0;
       

        getActiveEmploymentStatus({'origin':this.SelectedOrigin})
        .then(result => {               
            let response = JSON.parse(result);
            var isSuccess = response.isSuccess;  
            this.showLogs({'Response':response});   
            this.showLogs({'isSuccess':isSuccess,'Type':'getActiveEmploymentStatus'});    
            if(isSuccess){           
                this.MetadataURL = response.RecordId;                                        
                this.renderOptions = true;                
                this.disableButton.redirect = false;
                this.disableButton.update = false;  
                const empStsMap = new Map(Object.entries(response.employment_status));
                for (const [key_m, value_m] of empStsMap) {
                    this.showLogs(key_m, value_m);
                    this.employmentOptions.push({value:value_m, key:key_m}); 
                    }
                this.parsedEmploymentOptions = response;
                this.jsonifiedEmpSts = new Map(Object.entries(this.parsedEmploymentOptions.employment_status));

                const filterMap = new Map(Object.entries(response.allfilters));
                for (const [key_m, value_m] of filterMap) {
                    this.showLogs(key_m, value_m);
                    this.filterOptions.push({value:value_m, key:key_m}); 
                    }
                this.jsonifiedfilter = new Map(Object.entries(this.parsedEmploymentOptions.allfilters));    
                //this.OverflowFilter = response.OverflowFilter;
            }
            else if(!isSuccess){
                // this.showLogs({'isSuccess else':isSuccess});
                this.renderOptions = false;                
                this.disableButton.redirect = true;
                this.disableButton.update = true;  
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: "Warning!",
                        message: "The Active Employment Fetch Failed:"+response.error,
                        variant: "warning"
                    })
                );
            }  
            this.showSpinner = false;
         
        })
        .catch(error => {           
            // console.error('This is error pushToLM:'+error);    
            this.showSpinner = false;

            this.dispatchEvent(
                new ShowToastEvent({
                    title: "Error!",
                    message: "Something went wrong! Error:"+error.body,
                    variant: "error"
                })
            );     
        }); 
        
        }


    changeEmploymentState(event)
    {
        this.showLogs(event.target.value);
        var current_emp_sts =  event.target.value;
        this.showLogs('current_emp_sts-->'+current_emp_sts);
        this.showLogs('before jsonifiedEmpSts'+this.jsonifiedEmpSts);
        this.jsonifiedEmpSts.set(current_emp_sts,!this.jsonifiedEmpSts.get(current_emp_sts));
        this.showLogs('after jsonifiedEmpSts'+this.jsonifiedEmpSts);     
    }

    getOverFlowfilterVal(event)
    {
        this.showLogs(event.target.checked);
    //   var filterVal = event.target.checked;

    var current_filters =  event.target.checked;
    this.showLogs('current_filters-->'+current_filters);
    //   this.OverflowFilter = ! this.OverflowFilter ;
    //   this.showLogs({'OverflowFilter-->':this.OverflowFilter});
    this.showLogs('before jsonifiedfilter'+this.jsonifiedfilter);
    this.jsonifiedEmpSts.set(current_filters,!this.jsonifiedfilter.get(current_filters));
    this.showLogs('after jsonifiedfilter'+this.jsonifiedfilter);     

    }
    
    OpenMetadataRecord()
    {
        window.open(this.MetadataURL, '_blank');

    }

    decideTab(event){
        var currentTabVal = event.target.dataset.id;
        this.showLogs({'tabval':currentTabVal});


         const temps = this.template.querySelectorAll('[data-all-id="templateids"]').forEach(element => {
            this.showLogs({'temps':element.dataset.id});
           element.style.backgroundColor = 'white';
         })

       
         
        event.target.style.backgroundColor = '#DCDCDC';

        //'#F5F5F5';

        if(currentTabVal == 'bankstatement'){
            this.displayTabTemplate.bankstatements = true;
            this.displayTabTemplate.leadfilter = false;
        }
        else if(currentTabVal == 'leadfilter'){

            this.displayTabTemplate.bankstatements = false;
            this.displayTabTemplate.leadfilter = true;   
        }
    }
}
