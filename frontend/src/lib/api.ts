import {
  DatasetInfo,
  DatasetPreview,
  PreprocessingConfig,
  PreprocessingResult,
  EmbeddingResult,
  ClusterAnalysisResult,
  GeneExpressionLookup,
  TrainModelRequest,
  TrainedModelInfo,
  PredictionItem,
  PerturbationRequest,
  PerturbationResult,
  CellSceneData,
  ReportResponse,
  CorrelationResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.detail) {
        if (typeof errData.detail === 'string') {
          errMessage = errData.detail;
        } else if (errData.detail.message) {
          errMessage = `${errData.detail.message}: ${JSON.stringify(errData.detail.errors || '')}`;
        } else {
          errMessage = JSON.stringify(errData.detail);
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  async getHealth(): Promise<{ status: string; service: string; version: string; disclaimer: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  async initDemoDataset(): Promise<DatasetInfo> {
    const res = await fetch(`${API_BASE}/demo/initialize`, { method: 'POST' });
    return handleResponse<DatasetInfo>(res);
  },

  async initRealDataset(): Promise<DatasetInfo> {
    const res = await fetch(`${API_BASE}/real-data/initialize`, { method: 'POST' });
    return handleResponse<DatasetInfo>(res);
  },

  async listDatasets(): Promise<DatasetInfo[]> {
    const res = await fetch(`${API_BASE}/datasets`);
    return handleResponse<DatasetInfo[]>(res);
  },

  async getDatasetPreview(datasetId: string): Promise<DatasetPreview> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}`);
    return handleResponse<DatasetPreview>(res);
  },

  async uploadDataset(formData: FormData): Promise<DatasetInfo> {
    const res = await fetch(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      body: formData
    });
    return handleResponse<DatasetInfo>(res);
  },

  async deleteDataset(datasetId: string): Promise<{ status: string; dataset_id: string }> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}`, { method: 'DELETE' });
    return handleResponse(res);
  },

  async runPreprocessing(config: PreprocessingConfig): Promise<PreprocessingResult> {
    const res = await fetch(`${API_BASE}/preprocessing/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return handleResponse<PreprocessingResult>(res);
  },

  async getEmbeddings(datasetId: string, method: string = 'PCA', nComponents: number = 3): Promise<EmbeddingResult> {
    const res = await fetch(`${API_BASE}/analysis/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId, method, n_components: nComponents })
    });
    return handleResponse<EmbeddingResult>(res);
  },

  async getClusters(datasetId: string, nClusters: number = 4): Promise<ClusterAnalysisResult> {
    const res = await fetch(`${API_BASE}/analysis/clusters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId, n_clusters: nClusters })
    });
    return handleResponse<ClusterAnalysisResult>(res);
  },

  async lookupGene(datasetId: string, geneSymbol: string): Promise<GeneExpressionLookup> {
    const res = await fetch(`${API_BASE}/analysis/gene/${datasetId}/${encodeURIComponent(geneSymbol)}`);
    return handleResponse<GeneExpressionLookup>(res);
  },

  async trainModel(req: TrainModelRequest): Promise<TrainedModelInfo> {
    const res = await fetch(`${API_BASE}/prediction/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse<TrainedModelInfo>(res);
  },

  async listModels(datasetId: string): Promise<TrainedModelInfo[]> {
    const res = await fetch(`${API_BASE}/prediction/models/${datasetId}`);
    return handleResponse<TrainedModelInfo[]>(res);
  },

  async predictCells(modelId: string, datasetId: string): Promise<PredictionItem[]> {
    const res = await fetch(`${API_BASE}/prediction/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: modelId, dataset_id: datasetId })
    });
    return handleResponse<PredictionItem[]>(res);
  },

  async simulatePerturbation(req: PerturbationRequest): Promise<PerturbationResult> {
    const res = await fetch(`${API_BASE}/perturbation/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return handleResponse<PerturbationResult>(res);
  },

  async listPerturbations(datasetId: string): Promise<PerturbationResult[]> {
    const res = await fetch(`${API_BASE}/perturbation/runs/${datasetId}`);
    return handleResponse<PerturbationResult[]>(res);
  },

  async getScene(datasetId: string, activeGene?: string, perturbationDeltas?: any): Promise<CellSceneData> {
    const res = await fetch(`${API_BASE}/visualization/scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: datasetId,
        active_gene: activeGene,
        perturbation_deltas: perturbationDeltas
      })
    });
    return handleResponse<CellSceneData>(res);
  },

  async generateReport(datasetId: string, title?: string, modelId?: string, pertId?: string): Promise<ReportResponse> {
    const res = await fetch(`${API_BASE}/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: datasetId,
        title: title || '4D Digital Cell Research Report',
        model_id: modelId,
        perturbation_run_id: pertId
      })
    });
    return handleResponse<ReportResponse>(res);
  },

  async getMethodology(): Promise<any> {
    const res = await fetch(`${API_BASE}/methodology`);
    return handleResponse(res);
  },

  async getCorrelations(datasetId: string, targetColumn?: string): Promise<CorrelationResponse> {
    const url = targetColumn
      ? `${API_BASE}/analysis/correlations/${datasetId}?target_column=${encodeURIComponent(targetColumn)}`
      : `${API_BASE}/analysis/correlations/${datasetId}`;
    const res = await fetch(url);
    return handleResponse<CorrelationResponse>(res);
  }
};
