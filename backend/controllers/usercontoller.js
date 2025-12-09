

const login = async (req, res) => {

    const { userName, password } = req.body;
    const user = await User.findOne({ userName });
    if (!user) {
        return res.status(200).json({
            message: "user is not registered"
        })
    }
    const passCorrect = user.isPassCorrect(password);
    if (!passCorrect) {
        return res.status(201).json({
            message: "password is not correct"
        })

    }
    const accessToken = await user.generateAccessToken();
    const Rtoken = await user.generateRefreshToken();
    user.refreshToken = Rtoken
    await user.save()

    const safeuser = await User.findById(user._id).select("-password -refreshToken")


    const options = {
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
    }
    res.cookie("accessToken", accessToken, options)
    return res
        .status(200)
        .json({
            message: "user loggedin  sucessfuly",
            safeuser,
            accessToken
        })



}
const getUser = async (req, res) => {

    const Id = req.query.id

    if (!Id) {
        return res.status(404).json({
            message: "id  not found "
        })
    }
    const user = await User.findById(Id).select("-password -refreshToken")
    if (!user) {
        return res.status(404).json({
            message: "user is not found "
        })
    }

    return res.status(200).json({
        message: "user found successfully",
        user
    })
}