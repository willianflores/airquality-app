import prismaClient from "../../prisma";

interface MunRequest{
    municipio: string;
}

class LoadDayDataByMunService{
    async execute({municipio}: MunRequest){
        const findByMun = await prismaClient.day.findMany({
            where:{
                municipio: municipio,               

            },
            select:{
                id: false,
                date: true,
                pm2_5: true,
                municipio: true
            }          
            
        })

        return findByMun;
    }
}

export {LoadDayDataByMunService};
