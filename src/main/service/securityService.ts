import fs from "fs";    
    
export const getCert = (certName: string, certFilePath: string) => {
    if (process.env[certName]) {
        return process.env[certName]?.replace(/\\n/g, '\n');
    } else if (process.env[certFilePath]) {
        return fs.readFileSync(process.env[certFilePath], 'ascii');
    } else {
        return '';
    }
};
