import os
from typing import Optional, Dict, Any, List
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.jobs import RunNow, Task, NotebookTask
import httpx

class DatabricksClient:
    def __init__(self):
        self.host = os.getenv("DATABRICKS_HOST")
        self.token = os.getenv("DATABRICKS_TOKEN")
        self.workspace_id = os.getenv("DATABRICKS_WORKSPACE_ID")
        self.client = None
        
        if self.host and self.token:
            self.client = WorkspaceClient(
                host=self.host,
                token=self.token
            )
    
    async def submit_job(self, job_id: int, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Submit a job to Databricks"""
        if not self.client:
            return {"error": "Databricks client not configured"}
        
        try:
            run = self.client.jobs.run_now(
                job_id=job_id,
                notebook_params=parameters or {}
            )
            return {
                "run_id": run.run_id,
                "status": "submitted"
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def get_run_status(self, run_id: int) -> Dict[str, Any]:
        """Get the status of a job run"""
        if not self.client:
            return {"error": "Databricks client not configured"}
        
        try:
            run = self.client.jobs.get_run(run_id=run_id)
            return {
                "run_id": run_id,
                "status": run.state.life_cycle_state.value,
                "result_state": run.state.result_state.value if run.state.result_state else None
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def execute_sql(self, query: str, warehouse_id: str = None) -> Dict[str, Any]:
        """Execute SQL on Databricks SQL warehouse"""
        warehouse_id = warehouse_id or os.getenv("DATABRICKS_SQL_WAREHOUSE_ID")
        
        if not self.host or not self.token:
            return {"error": "Databricks not configured"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.host}/api/2.0/sql/statements",
                    headers={"Authorization": f"Bearer {self.token}"},
                    json={
                        "warehouse_id": warehouse_id,
                        "statement": query,
                        "wait_timeout": "30s"
                    }
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def list_models(self, registry_name: str = None) -> List[Dict[str, Any]]:
        """List models from MLflow registry"""
        if not self.client:
            return []
        
        try:
            models = self.client.model_registry.list_registered_models()
            return [
                {
                    "name": m.name,
                    "latest_version": m.latest_versions[0].version if m.latest_versions else None,
                    "description": m.description
                }
                for m in models
            ]
        except Exception as e:
            return []
    
    async def get_model_serving_endpoint(self, endpoint_name: str) -> Optional[str]:
        """Get serving endpoint URL for a model"""
        if not self.client:
            return None
        
        try:
            endpoint = self.client.serving_endpoints.get(name=endpoint_name)
            return endpoint.config.served_entities[0].entity_name if endpoint.config.served_entities else None
        except Exception:
            return None
