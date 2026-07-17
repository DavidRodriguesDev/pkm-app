/**
 * Script de teste para interpretador de voz LLM
 */

const FRASES_TESTE = [
  // Criar tarefas - variações de "tenho que"
  {
    frase: 'tenho que fazer uma atividade de matemática até amanhã às 5 horas da tarde',
    tipo: 'criar',
    expectativas: {
      titulo: 'atividade de matemática',
      materia: 'Estudo',
      data_prazo_relativa: 'amanhã',
    },
  },
  {
    frase: 'preciso fazer uma reunião de trabalho até hoje às 6 da tarde',
    tipo: 'criar',
    expectativas: {
      titulo: 'reunião de trabalho',
      materia: 'Trabalho',
    },
  },
  {
    frase: 'tenho que estudar física até depois de amanhã às 9 da manhã',
    tipo: 'criar',
    expectativas: {
      titulo: 'estudar física',
      materia: 'Estudo',
    },
  },
  {
    frase: 'preciso entregar o relatório do projeto até sexta-feira',
    tipo: 'criar',
    expectativas: {
      titulo: 'relatório do projeto',
      materia: 'Trabalho',
    },
  },
  {
    frase: 'não posso esquecer de mandar o email para o cliente amanhã',
    tipo: 'criar',
    expectativas: {
      titulo: 'mandar email para o cliente',
      materia: 'Trabalho',
    },
  },
  {
    frase: 'preciso comprar café amanhã de manhã',
    tipo: 'criar',
    expectativas: {
      titulo: 'comprar café',
      materia: 'Pessoal',
    },
  },
  {
    frase: 'tenho que ligar para o médico na próxima semana',
    tipo: 'criar',
    expectativas: {
      titulo: 'ligar para o médico',
      materia: 'Pessoal',
    },
  },

  // Concluir tarefas - variações de "realizei"
  {
    frase: 'realizei pagar conta de luz',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'pagar conta de luz',
    },
  },
  {
    frase: 'terminei o trabalho de biologia',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'trabalho de biologia',
    },
  },
  {
    frase: 'concluí ler o capítulo 3 do livro',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'ler o capítulo 3 do livro',
    },
  },

  // Concluir tarefas - variações de "fiz"
  {
    frase: 'fiz a lista de exercícios de química',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'lista de exercícios de química',
    },
  },
  {
    frase: 'finalizei o relatório do projeto',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'relatório do projeto',
    },
  },
  {
    frase: 'dei conta de organizar a mesa',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'organizar a mesa',
    },
  },

  // Concluir tarefas - variações de "terminei"
  {
    frase: 'terminei de ler o livro ontem',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'ler o livro',
    },
  },

  // Casos especiais
  {
    frase: 'tenho que fazer uma apresentação para amanhã às 14h',
    tipo: 'criar',
    expectativas: {
      titulo: 'apresentação',
      materia: 'Trabalho',
    },
  },
  {
    frase: 'preciso marcar consulta odontológica para a próxima segunda-feira',
    tipo: 'criar',
    expectativas: {
      titulo: 'marcar consulta odontológica',
      materia: 'Pessoal',
    },
  },
  {
    frase: 'realizei a apresentação do projeto',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'apresentação do projeto',
    },
  },
  {
    frase: 'terminei de estudar para a prova de matemática',
    tipo: 'concluir',
    expectativas: {
      tarefa: 'estudar para a prova de matemática',
    },
  },
  {
    frase: 'não posso esquecer de levantar as 7h amanhã',
    tipo: 'criar',
    expectativas: {
      titulo: 'levantar as 7h',
      materia: 'Pessoal',
    },
  },
];

const DESCRICOES_TESTE = [
  { frase: 'Tenho que fazer X até amanhã às 5 da tarde', objetivo: 'Criar com data relativa' },
  { frase: 'Preciso fazer X hoje às 6 da tarde', objetivo: 'Criar com hora específica' },
  { frase: 'Tenho que estudar X até depois de amanhã às 9 da manhã', objetivo: 'Criar com data relativa composta' },
  { frase: 'Não posso esquecer de Y', objetivo: 'Criar com "não posso esquecer"' },
  { frase: 'Realizei X', objetivo: 'Concluir tarefa existente' },
  { frase: 'Terminei X', objetivo: 'Concluir com "terminei"' },
  { frase: 'Concluí X', objetivo: 'Concluir com "concluí"' },
  { frase: 'Finalizei X', objetivo: 'Concluir com "finalizei"' },
  { frase: 'Dei conta de X', objetivo: 'Concluir com "dei conta"' },
  { frase: 'Fiz X', objetivo: 'Concluir com "fiz"' },
  { frase: 'Tive que fazer X', objetivo: 'Criar com "tive que"' },
  { frase: 'Vou ter que fazer X', objetivo: 'Criar com "vou ter que"' },
];

// Função para rodar os testes (simulação)
function rodarTestesSimulados() {
  console.log('=== LISTA DE FRASES DE TESTE ===\n');

  let criacaoCount = 0;
  let concluirCount = 0;

  FRASES_TESTE.forEach((test, index) => {
    console.log(`${index + 1}. [${test.tipo.toUpperCase()}] ${test.frase}`);
    console.log(`   Esperado: ${JSON.stringify(test.expectativas)}\n`);

    if (test.tipo === 'criar') criacaoCount++;
    if (test.tipo === 'concluir') concluirCount++;
  });

  console.log('\n=== RESUMO ===');
  console.log(`Total de frases: ${FRASES_TESTE.length}`);
  console.log(`Criar tarefas: ${criacaoCount}`);
  console.log(`Concluir tarefas: ${concluirCount}`);
}

// Exportar para uso no React Native
export { FRASES_TESTE, DESCRICOES_TESTE, rodarTestesSimulados };
