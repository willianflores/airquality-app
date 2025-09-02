#!/usr/bin/env node

/**
 * Script para validar o arquivo reports.json
 * Uso: npm run validate-reports
 */

const fs = require('fs');
const path = require('path');

// Função para validar URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return url.startsWith('/') && url.length > 1;
  }
}

// Função para validar data
function isValidDate(dateString) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;

  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getDate() === day && 
         date.getMonth() === month - 1 && 
         date.getFullYear() === year;
}

// Função para validar relatório
function validateReport(report, index) {
  const errors = [];

  if (!report.title || report.title.trim().length < 5) {
    errors.push(`Título deve ter pelo menos 5 caracteres`);
  }

  if (!report.description || report.description.trim().length < 20) {
    errors.push(`Descrição deve ter pelo menos 20 caracteres`);
  }

  if (!report.imageUrl || !isValidUrl(report.imageUrl)) {
    errors.push(`URL da imagem deve ser válida`);
  }

  if (!report.fileUrl || !isValidUrl(report.fileUrl)) {
    errors.push(`URL do arquivo deve ser válida`);
  }

  if (!report.date || !isValidDate(report.date)) {
    errors.push(`Data deve estar no formato DD/MM/AAAA`);
  }

  return errors;
}

async function main() {
  console.log('🔍 Validando arquivo reports.json...\n');

  try {
    // Carregar arquivo
    const reportsPath = path.join(__dirname, '../src/data/reports.json');
    
    if (!fs.existsSync(reportsPath)) {
      throw new Error('Arquivo reports.json não encontrado');
    }

    const reportsData = fs.readFileSync(reportsPath, 'utf-8');
    let reports;

    try {
      reports = JSON.parse(reportsData);
    } catch (error) {
      throw new Error('Arquivo JSON inválido: ' + error.message);
    }

    if (!Array.isArray(reports)) {
      throw new Error('reports.json deve conter um array');
    }

    console.log(`📊 Total de publicações: ${reports.length}`);

    // Validar cada relatório
    let hasErrors = false;
    const duplicateTitles = new Set();
    const duplicateFiles = new Set();

    reports.forEach((report, index) => {
      const errors = validateReport(report, index);
      
      if (errors.length > 0) {
        hasErrors = true;
        console.log(`\n❌ Relatório ${index + 1}:`);
        console.log(`   Título: "${report.title}"`);
        errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }

      // Verificar duplicatas
      if (duplicateTitles.has(report.title)) {
        hasErrors = true;
        console.log(`\n⚠️  Título duplicado: "${report.title}"`);
      } else {
        duplicateTitles.add(report.title);
      }

      if (duplicateFiles.has(report.fileUrl)) {
        hasErrors = true;
        console.log(`\n⚠️  URL de arquivo duplicada: "${report.fileUrl}"`);
      } else {
        duplicateFiles.add(report.fileUrl);
      }
    });

    // Verificar ordenação por data
    const sortedByDate = [...reports].sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });

    const isCorrectlyOrdered = JSON.stringify(reports) === JSON.stringify(sortedByDate);
    if (!isCorrectlyOrdered) {
      console.log('\n⚠️  Relatórios não estão ordenados por data (mais recente primeiro)');
      console.log('   Execute o script de reordenação ou reordene manualmente');
    }

    // Estatísticas
    const years = [...new Set(reports.map(r => {
      const [, , year] = r.date.split('/');
      return parseInt(year);
    }))];

    console.log('\n📈 Estatísticas:');
    console.log(`   • Anos cobertos: ${Math.min(...years)} - ${Math.max(...years)}`);
    console.log(`   • Publicações por ano:`);
    
    const yearCounts = reports.reduce((acc, report) => {
      const [, , year] = report.date.split('/');
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {});

    Object.entries(yearCounts)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .forEach(([year, count]) => {
        console.log(`     ${year}: ${count} publicações`);
      });

    if (hasErrors) {
      console.log('\n❌ Validação falhou! Corrija os erros acima.');
      process.exit(1);
    } else {
      console.log('\n✅ Todos os relatórios são válidos!');
      console.log('\n💡 Dicas para manter a qualidade:');
      console.log('   • Sempre adicionar novos relatórios no início do array');
      console.log('   • Usar nomes de arquivo descritivos');
      console.log('   • Manter descrições informativas');
      console.log('   • Verificar se imagens e PDFs existem');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar script
if (require.main === module) {
  main();
}

