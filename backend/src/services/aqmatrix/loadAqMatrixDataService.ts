import prismaClient from "../../prisma";


class LoadAqMatrixDataService {
    async execute(){
        const aq_matrix = await prismaClient.aq_matrix.findMany({
            select:{
                id: false,
                mes: true,
                hora: true,
                total: true
            }
        })

        return aq_matrix;
    }
}

export {LoadAqMatrixDataService}