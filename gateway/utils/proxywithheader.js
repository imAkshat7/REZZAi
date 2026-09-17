import proxy from "express-http-proxy"

export const proxywithheader=(serviceurl)=>{

    return Proxy(serviceurl)
}
