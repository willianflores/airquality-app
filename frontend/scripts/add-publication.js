#!/usr/bin/env node

/**
 * Script para adicionar novas publicações de forma automatizada
 * Uso: node scripts/add-publication.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para fazer perguntas
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
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

// Função para gerar nome de arquivo
function generateFileName(title, date) {
  const [day, month, year] = date.split('/');
  const datePrefix = `${year}${month}${day}`;
  
  const titleSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .substring(0, 50); // Limita tamanho

  return `${datePrefix}_${titleSlug}`;
}

async function main() {
  console.log('🚀 Assistente para Adicionar Nova Publicação\n');

  try {
    // Coletar informações
    const title = await question('📝 Título da publicação: ');
    if (!title || title.trim().length < 5) {
      throw new Error('Título deve ter pelo menos 5 caracteres');
    }

    const description = await question('📄 Descrição: ');
    if (!description || description.trim().length < 20) {
      throw new Error('Descrição deve ter pelo menos 20 caracteres');
    }

    const date = await question('📅 Data (DD/MM/AAAA): ');
    if (!isValidDate(date)) {
      throw new Error('Data deve estar no formato DD/MM/AAAA');
    }

    // Gerar nomes de arquivo
    const fileName = generateFileName(title, date);
    const imageUrl = `/reports/img/${fileName}.jpg`;
    const fileUrl = `/reports/pdf/${fileName}.pdf`;

    console.log(`\n📁 Arquivos sugeridos:`);
    console.log(`🖼️  Imagem: public${imageUrl}`);
    console.log(`📄 PDF: public${fileUrl}`);

    const confirm = await question('\n✅ Confirma a adição? (s/N): ');
    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operação cancelada');
      rl.close();
      return;
    }

    // Criar objeto da publicação
    const newReport = {
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      fileUrl,
      date
    };

    // Carregar dados existentes
    const reportsPath = path.join(__dirname, '../src/data/reports.json');
    const existingReports = JSON.parse(fs.readFileSync(reportsPath, 'utf-8'));

    // Adicionar nova publicação no início
    const updatedReports = [newReport, ...existingReports];

    // Salvar arquivo atualizado
    fs.writeFileSync(reportsPath, JSON.stringify(updatedReports, null, 2));

    console.log('\n🎉 Publicação adicionada com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log(`1. Adicione a imagem: public${imageUrl}`);
    console.log(`2. Adicione o PDF: public${fileUrl}`);
    console.log('3. Teste a página no navegador');
    console.log('\n💡 A página será atualizada automaticamente!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    rl.close();
  }
}

// Executar script
if (require.main === module) {
  main();
}

module.exports = { generateFileName, isValidDate };

