import prismaClient from "../../prisma";

class LoadDayDataService{
    async execute(){
        const day = await prismaClient.day.findMany({
            select:{
                id: false,
                date: true,
                pm2_5: true,
                municipio: true
            }

        })

        return day;
    }
}

export {LoadDayDataService};