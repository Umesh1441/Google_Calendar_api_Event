const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const notifier = require('node-notifier');
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const nodemailer = require('nodemailer');
require('dotenv').config();

//middle wear
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
//setting up view engine
app.set("view engine", "ejs");

//db connect
mongoose.connect("mongodb+srv://nodejsboy:nodejsboy@cluster0.1vzsvxk.mongodb.net/?retryWrites=true", {
    dbName: "backend",
})
    .then(() => console.log("database connected....."))
    .catch(() => { console.log("error in db connect") });

//schema
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
})
const User = mongoose.model("User", userSchema);

const isAuthenticated = async (req, res, next) => {
    const { token } = req.cookies;
    if (token) {
        const decoded = jwt.verify(token, "kjdhbgvhdjsnm");
        //imp
        req.user = await User.findById(decoded._id);
        console.log(decoded);
        next();
    }
    else {
        res.redirect("/login");
    }
}



app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;
    console.log("usernaem" + username);
    if (!username || !password || !email) {
        return res.status(422).json({ error: "Please add all the fields" });
    }
    else {
        const hashpassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            email,
            password:hashpassword,
        })

        try {
            await user.save();
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
            return res.status(200).json({ message: "User Registered Successfully", token });

        }
        catch (err) {
            console.log(err);
            return res.status(422).json({ error: "User Not Registered" });
        }
    }
})
app.get("/", isAuthenticated, (req, res) => {
    res.render("logout", { name: req.user.name });
})
app.post('/signin', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(422).json({ error: "Please add all the fields" });
    }
    else {
        User.findOne({ email: email })
            .then(savedUser => {
                if (!savedUser) {
                    return res.status(422).json({ error: "Invalid Credentials" });
                }
                else {
                    console.log(savedUser);
                    bcrypt.compare(password, savedUser.password)
                        .then(
                            doMatch => {
                                if (doMatch) {
                                    const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET);

                                    const { _id, username, email } = savedUser;

                                    res.json({ message: "Successfully Signed In", token, user: { _id, username, email } });
                                }
                                else {
                                    return res.status(422).json({ error: "Invalid Credentials" });
                                }
                            }
                        )
                    // res.status(200).json({ message: "User Logged In Successfully", savedUser });
                }
            })
            .catch(err => {
                console.log(err);
            })
    }
})
app.get("/logout", (req, res) => {
    res.cookie("token", null, {
        httpOnly: true,
        expires: new Date(Date.now()),
    });
})


//OTP VERIFICATION..
async function mailer(recieveremail, code) {
    // console.log("Mailer function called");

    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,

        secure: false, // true for 465, false for other ports
        requireTLS: true,
        auth: {
            user: process.env.Nodemailer_email, // generated ethereal user
            pass: process.env.Nodemailer_password, // generated ethereal password
        },
    });


    let info = await transporter.sendMail({
        from: "CampusConnect",
        to: `${recieveremail}`,
        subject: "Email Verification",
        text: `Your Verification Code is ${code}`,
        html: `<b>Your Verification Code is ${code}</b>`,
    })

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
app.post('/verifyfp', (req, res) => {
    // console.log(req.body); 
    console.log('sent by client', req.body);
    const { email } = req.body;

    if (!email) {
        return res.status(422).json({ error: "Please add all the fields" });
    }

    User.findOne({ email: email }).then(async (savedUser) => {
        if (savedUser) {
            try {
                // console.log(savedUser);
                let VerificationCode = Math.floor(100000 + Math.random() * 900000);
                await mailer(email, VerificationCode);
                console.log("Verification Code", VerificationCode);
                res.send({ message: "Verification Code Sent to your Email", VerificationCode, email });
            }
            catch (err) {
                console.log(err);
            }
        }
        else {
            return res.status(422).json({ error: "Invalid Credentials" });

        }
    }
    )
})
app.post('/resetpassword', async(req, res) => {
    const { email, password } = req.body;

    const hashpassword =await bcrypt.hash(password, 10);
    if (!email || !password) {
        return res.status(422).json({ error: "Please add all the fields" });
    }
    else {
        User.findOne({ email: email })
            .then(async (savedUser) => {
                if (savedUser) {
                    savedUser.password = hashpassword;
                    savedUser.save()
                        .then(user => {
                            res.json({ message: "Password Changed Successfully" });
                        })
                        .catch(err => {
                            console.log(err);
                        })
                }
                else {
                    return res.status(422).json({ error: "Invalid Credentials" });
                }
            })
    }

})


app.listen(5000, () => {
    console.log("Listen on the port 5000...");
});


// MONGO_URI=mongodb+srv://nodejsboy:nodejsboy@cluster0.1vzsvxk.mongodb.net/?retryWrites=true

// JWT_SECRET=fghjkhfgdffgjjedf

// Nodemailer_password="hwmrcodtigdvcqsu"

// Nodemailer_email="umeshtak34@gmail.com"

app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
        return res.redirect("/login");
    }
    const hashpassword = await bcrypt.hash(password, 10);
    user = await User.create({
        name,
        email,
        password: hashpassword,
    });

    const token = jwt.sign({ _id: user._id }, "kjdhbgvhdjsnm");
    res.cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 60 * 1000),
    });
    res.redirect("/login");
});
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
        console.log("not exist");
        return res.redirect("/register");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        console.log("wrong password");
        notifier.notify({
            title: 'Node.js Notification',
            message: 'Hello, World!'
        });
        return res.render("login");
    }

    const token = jwt.sign({ _id: user._id }, "kjdhbgvhdjsnm");
    res.cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 60 * 1000),
    });
    res.redirect("/");
})