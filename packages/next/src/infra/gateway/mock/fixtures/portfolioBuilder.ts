import type {
  GetPortfolioBuilderPreviewOutput,
  GetPortfolioBuilderRiskSelectOutput,
  PostPortfolioBuilderCreatePortfolioOutput,
} from '../../../../application/ports';

export function getPortfolioBuilderRiskSelectMock(): GetPortfolioBuilderRiskSelectOutput {
  return {
    riskLevels: [
      { id: 'low', name: 'Conservador', description: 'Menor risco, menor retorno.' },
      { id: 'moderate', name: 'Moderado', description: 'Equilíbrio entre risco e retorno.' },
      { id: 'high', name: 'Arrojado', description: 'Maior risco, maior retorno potencial.' },
    ],
  };
}

export function getPortfolioBuilderPreviewMock(): GetPortfolioBuilderPreviewOutput {
  return {
    riskLevel: 'moderate',
    expectedReturn: 0.124,
    allocation: [
      { assetClass: 'Renda Fixa', weight: 0.5 },
      { assetClass: 'Ações', weight: 0.35 },
      { assetClass: 'Multimercado', weight: 0.15 },
    ],
  };
}

export function postPortfolioBuilderCreatePortfolioMock(): PostPortfolioBuilderCreatePortfolioOutput {
  return {
    portfolioId: 'pf_custom_0001',
    status: 'created',
    riskLevel: 'moderate',
  };
}
