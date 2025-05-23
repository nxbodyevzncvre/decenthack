import axios from "axios";




export async function signUp(lastname, firstname, middlename, phone, password){
    try{
        const response = await axios.post("http://localhost:5050/pilot/sign-up", {
            firstname,
            lastname,
            middlename,
            phone,
            password
        });
        
        return response;
    }catch(error){
        throw error.message;
    }
}


export async function signIn(phone, password){
    try{
        const response = await axios.post("http://localhost:5050/pilot/sign-in", {
            phone,
            password
        });
        return response;
    }catch(error){
        throw error.message;
    }
}