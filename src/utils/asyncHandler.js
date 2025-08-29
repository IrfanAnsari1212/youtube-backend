const asynkHandler = (requesthandler)=>{
    (req, res, next) => {
        Promise.resolve(requesthandler(req, res, next)).catch((error) => next(error))
    }
}






export { asynkHandler }

// upar wala kaam  aise async aur await se v ho sakta hai

// const asyncHandler = (fn)=> async (req, res, next)=>{
//     try {
//        await fn(req, res, next) 
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message || "Internal Server Error"
//         })
        
//     }
// }