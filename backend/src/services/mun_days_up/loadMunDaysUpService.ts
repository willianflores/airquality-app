import prismaClient from "../../prisma";


class LoadMunDaysUpDataService {
    async execute(){
        const mun_days_up = await prismaClient.mun_days_up.findMany({
            select:{
                id: false,
                municipio: true,
                year: true,
                days_up: true
            }
        })

        return mun_days_up;
    }
}

export { LoadMunDaysUpDataService }