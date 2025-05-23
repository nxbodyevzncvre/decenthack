import axios from "axios";




export async function signUp({lastname, firstname, middlename, phone, password}){
    try{
        const response = await axios.post("https://localhost:8080/sign-up", {
            lastname,
            firstname,
            middlename,
            phone,
            password
        });
        
        return response;
    }catch(error){
        throw error;
    }
}


export async function signIn({phonenumber, password}){
    try{
        const response = await axios.post("https://localhost:8080/sign-up", {
            phonenumber,
            password
        });
        return response;
    }catch(error){
        throw error;
    }
}