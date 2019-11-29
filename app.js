var nodemailer = require('nodemailer');
const timestamp = require('time-stamp');
var express = require('express');
bodyParser  = require("body-parser");
var mongoose=require('mongoose');



var app = express();
mongoose.connect("mongodb://localhost/test_app");
app.use(bodyParser.urlencoded({extended: true}));

app.set("view engine","ejs");


//global variable to pass error msgs to welcome.ejs
var topass=0;

//nodemailer userpassword auth
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: ' ',   //enter gmail username here
      pass: ''         //enter password here
    }
  });


//twilio sms auth
const accountSid = ' ';     //Enter Sif
const authToken = ' ';       //Enter AuthToken
const client = require('twilio')(accountSid, authToken);



//Schema for visitors collection
var visitorSchema= new mongoose.Schema({
    name:String,
    phoneNum: String,
    email: String,
    checkInTime: String,
    checkOutTime: String,
    Hostemail:String
});

//Schema for Host collection
var HostSchema=new mongoose.Schema({
    Hostname: String,
    HostphoneNum:String,
    Hostemail:String
})

//Adding these schemas to collection
var Visitor=mongoose.model("Visitor",visitorSchema);
var Host=mongoose.model("Host",HostSchema);




app.get('/', function(req, res) {
    var x;
    x=topass;
    topass=0;
 res.render('welcome',{flag:x});
});



app.get("/checkin", function(req, res){
    res.render("checkin.ejs"); 
 });

 app.post("/checkin", function(req, res){
    
    var name = req.body.name;
    var email=req.body.email;
    var number= req.body.number;
    var checkInTime=timestamp('YYYY/MM/DD-HH:mm');
    var Hostemail=req.body.Hostemail;
    var HostphoneNum=req.body.HostphoneNum;

    if(number.length==10)
    number='+91'+number;

    if(HostphoneNum.length==10)
    HostphoneNum='+91'+HostphoneNum;

    
    var newVisitor = {name: name, phoneNum:number, email:email, checkInTime:checkInTime,checkOutTime:null,Hostemail:req.body.Hostemail};

    var newHost={Hostname:req.body.Hostname,
        Hostemail:req.body.Hostemail,HostphoneNum:req.body.HostphoneNum};

        
    Host.find({Hostemail:Hostemail},function(err,hosts){
        if(hosts.length==0)
        {
            Host.create(newHost,function(err,newcreated)
            {
                if(err)
                console.log(err);
            })
        }
    })


    Visitor.find({phoneNum:number},function(err,visitors){
        if(err)
        console.log(err);
        else
        {
   
            var obj=visitors.find(o=>o.checkOutTime==null);

            if(obj!=null)
            {
                console.log("user is already checked in");
                topass=1;
                res.redirect("/");
            }
            else
            {
                Visitor.create(newVisitor, function(err, newlyCreated){
                            if(err){
                                console.log(err);
                            } 
                            else {
                                    var mailOptions = {
                                        from: ' ',  //Enter email id here
                                        to: newVisitor.Hostemail,
                                        subject: 'Your Guest Details',
                                        text: '\r\n'+'Name:'+newVisitor.name+'\r\n'+'PhoneNumer:'+newVisitor.phoneNum+'\r\n'+'checkInTime: '+newVisitor.checkInTime+'\r\n'+'email:  '+newVisitor.email
                                    };
                                    
                                    transporter.sendMail(mailOptions, function(error, info){
                                        if (error) {
                                        console.log(error);
                                        } else {
                                        console.log('Email sent: ' + info.response);    
                                        }
                                    }); 
                                    
                                    client.messages
                                    .create({
                                        body: '\r\n'+'Your Guest Details'+'\r\n'+'Name:'+newVisitor.name+'\r\n'+'PhoneNumer:'+newVisitor.phoneNum+'\r\n'+'checkInTime : '+newVisitor.checkInTime+'\r\n'+'email :  '+newVisitor.email,
                                        from: ' ', //Enter your Twilio Number here
                                        to:HostphoneNum
                                    },function(err,info)
                                    {
                                        if(err)
                                        console.log(err);
                                        else
                                        console.log("message sent"+info);
                                    });
                                    topass=3;
                                    console.log("user successfully checked in");
                                 res.redirect("/");
                                }
            });
        }
    }
});
});



app.get("/checkout", function(req, res){
    res.render("checkout.ejs"); 
 });

 app.post("/checkout", function(req, res){
    var name = req.body.name;
    var num=req.body.number;

    if(num.length==10)
    num='+91'+num;
    Visitor.find({phoneNum:num},function(err,visitors){
        if(err)
        console.log(err);
        else
        {
            if(visitors.length==0)
            {
                topass=2;
                console.log("user not checked in");
                res.redirect("/");
            }
            else
            {
               
                var obj=visitors.find(o=>o.checkOutTime==null);
               
                if(obj==null)
                {
                    console.log("user not checked in");
                    topass=2;
                    res.redirect("/");
                }
                else
                {
                      obj.checkOutTime=timestamp('YYYY/MM/DD-HH:mm');

                        var hostd;
                        Host.find({Hostemail:obj.Hostemail},function(err,host){
                            if(err)
                            console.log(err);
                            else
                            {
                               
                                hostd=host[0];
                                Visitor.updateOne({_id:obj._id}, {checkOutTime:obj.checkOutTime},function(err,arr)
                                {
                                    if(err)
                                    console.log(err);
                                    else
                                    {
                                        var mailOptions = {
                                        from: ' ',  //enter your Email id here
                                        to: obj.email,
                                        subject: 'Your CheckOut Details',
                                        text:   '\r\n'+'Your visit details are:'+ 'Name:'+obj.name+'\r\n'+'PhoneNumer:'+obj.phoneNum+'\r\n'+'checkInTime:'+'\r\n'+obj.checkInTime+'\r\n'+'checkOutTime'+'\r\n'+obj.checkOutTime
                                                +'\r\n'+'HostName: '+hostd.Hostname+'\r\n'+'Hostnameemail: '+hostd.Hostemail+'\r\n'
                                         };
                                  
                                        transporter.sendMail(mailOptions, function(error, info){
                                            if (error) {
                                            console.log(error);
                                            } else {
                                            console.log('Email sent: ' + info.response);
                                            }
                                        }); 
        
                                        console.log("user successfully checked out");
                                        topass=4;
                                        res.redirect("/");
                                    }
                                });
        
                                
                            }
                        })
                       
                }
            }
        }
    })
    
});



app.listen(3000, function() {
 console.log("Server is running at 3000 port!");
}); 