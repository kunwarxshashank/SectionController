import mongoose from "mongoose";

const admins = new mongoose.Schema({
    sectionId:String,
    password:String,
    email:String , 
    twoFa:Boolean,
    lastLogin:Time,

})


admins.pre("save" , async function(){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password , 10)
    }
}
    
)
admins.methods.isPassCorrect = async function (password)  {
    return bcrypt.compare(this.password , password)
};
admins.methods.generateAccessToken = async function ()  {
    return jwt.sign({
        _id : this._id,
        userName : this.userName
    },process.env.ATS )
}
admins.methods.generateRefreshToken = async function ()  {
    return jwt.sign({
        _id : this._id,
        userName : this.userName
    },process.env.RTS)
}

const admins = mongoose.model("admins", admins);
module.exports = admins;