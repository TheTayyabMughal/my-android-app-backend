const asynchandler=(requesthanlder)=>{
    return (req,res,next)=>{
        Promise.resolve(requesthanlder(req,res,next)).catch((err)=>next(err));
    }
    }
    export {asynchandler}