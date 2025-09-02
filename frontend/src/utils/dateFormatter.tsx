export function getCurrentDateTime(): string {
    const now = new Date();

    // Obtém o ano atual
    const year = now.getFullYear();
    const month = String(1).padStart(2, '0'); // Mês (0-11, adicionamos 1)
    const day = String(1).padStart(2, '0'); // Dia
    const hours = String(0).padStart(2, '0'); // Horas
    const minutes = String(0).padStart(2, '0'); // Minutos
    const seconds = String(0).padStart(2, '0'); // Segundos

    // Formata a data e hora no formato "YYYY-MM-DD HH:mm:ss"
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
