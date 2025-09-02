import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";

export function AqTable() {
    
    const aqtabledata = [
        {
            classe: "n/a",
            description: "O sensor não esta coletando dados no momento"
        },
        {
            classe: "0-12",
            description: "A qualidade do ar é considerada satisfatória e a poluição do ar não apresenta risco a população"
        },
        {
            classe: "12-35",
            description: "A qualidade do ar é aceitável. No entanto, se expostos por 24 horas ou mais, pode haver um problema de espaço moderado para um número muito pequeno de pessoas"
        },
        {
            classe: "35-55",
            description: "Pessoas de grupos sensíveis podem sofrer efeitos na área se expostos por 24 horas. Não é provável que o mínimo em geral seja afetado"
        },
        {
            classe: "55-150",
            description: "Membros do mínimo em geral podem iniciar a ter efeitos na área se expostos por 24 horas; membros de grupos sensíveis podem experimentar efeitos mais graves na área"
        },
        {
            classe: "150-250",
            description: "Alerta de saúde: todos podem experimentar efeitos mais graves na saúde se expostos por 24 horas"    
        },
        {
            classe: "250+",
            description: "Avisos de saúde de condições de emergência se expostos por 24 horas. Toda a população pode ser afetada"
        }
        
    ]

    function getBackgroundColor(classe: string) {
        switch (classe) {
            case 'n/a':
                return '#969696';
            case '0-12':
                return '#68e143'; 
            case '12-35':
                return '#ffff55';
            case '35-55':
                return '#ef8533'; 
            case '55-150':
                return '#ea3324';
            case '150-250':
                return '#8c1a4b'; 
            case '250+':
                return '#731425'; 
            default:
                return '#FFFFFF'; 
        }
    }

    return (
        <Table className="w-full">
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[70px] ">Classe</TableHead>
                    <TableHead className="text-center">Descrição</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {aqtabledata.map((data) => (
                    <TableRow key={data.classe}>
                        <TableCell className="h-16 text-center text-gray-950" style={{ backgroundColor: getBackgroundColor(data.classe) }}>{data.classe}</TableCell>
                        <TableCell>{data.description}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>    
    )
}