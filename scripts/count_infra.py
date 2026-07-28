"""
docker-compose servis sayısı ve FastAPI route sayısını otomatik sayar.

Neden: Makale/rapor "9 Docker servisi" ve "25 REST endpoint" diyordu; gerçek sayılar
elle güncellenmediği için koddan kopmuştu (bkz. hakem revizyon PDF'i, madde 4.1/4.2/
5.19). Bu script çalıştırıldığında her zaman güncel gerçek sayıyı verir — makaleye
yazılacak rakam burada üretilen çıktı olmalı, elle sayılmamalı.

Kullanım:
    python scripts/count_infra.py
"""
import os
import sys

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT)


def count_docker_services() -> dict:
    with open(os.path.join(ROOT, "docker-compose.yml"), "r", encoding="utf-8") as f:
        compose = yaml.safe_load(f)

    services = compose.get("services", {})
    production, dev_only = [], []
    for name, cfg in services.items():
        profiles = (cfg or {}).get("profiles") or []
        if "dev" in profiles:
            dev_only.append(name)
        else:
            production.append(name)

    return {"production": sorted(production), "dev_only": sorted(dev_only)}


def count_api_routes() -> dict:
    from app.main import app

    routes_by_module: dict[str, int] = {}
    fastapi_builtin_routes = 0  # /docs, /openapi.json, /redoc vb. — REST API'nin parçası değil
    for route in app.routes:
        methods = getattr(route, "methods", None)
        if not methods:
            continue
        endpoint = getattr(route, "endpoint", None)
        module = getattr(endpoint, "__module__", "unknown") if endpoint else "unknown"
        if not module.startswith("app.api"):
            fastapi_builtin_routes += 1
            continue
        routes_by_module[module] = routes_by_module.get(module, 0) + 1

    total_routes = sum(routes_by_module.values())
    endpoint_modules = [
        m for m in routes_by_module
        if m.startswith("app.api.v1.endpoints")
    ]
    return {
        "total_routes": total_routes,
        "fastapi_builtin_routes_excluded": fastapi_builtin_routes,
        "endpoint_module_count": len(endpoint_modules),
        "routes_by_module": dict(sorted(routes_by_module.items(), key=lambda kv: -kv[1])),
    }


def main():
    docker = count_docker_services()
    print("=== Docker Compose Servisleri ===")
    print(f"Production: {len(docker['production'])}")
    for s in docker["production"]:
        print(f"  - {s}")
    print(f"Dev-only (profiles: dev): {len(docker['dev_only'])}")
    for s in docker["dev_only"]:
        print(f"  - {s}")

    print("\n=== FastAPI Route'ları ===")
    api = count_api_routes()
    print(f"Toplam REST API route'u (app.api altında, method'lu): {api['total_routes']}")
    print(f"  (Hariç tutulan FastAPI built-in route: {api['fastapi_builtin_routes_excluded']} — /docs, /openapi.json, /redoc vb.)")
    print(f"Endpoint modülü sayısı (app/api/v1/endpoints/*.py): {api['endpoint_module_count']}")
    print("\nModül başına route sayısı:")
    for module, count in api["routes_by_module"].items():
        print(f"  {module}: {count}")

    print(
        "\nMakalede kullanılabilecek doğru ifadeler:\n"
        f'  "The production deployment consists of {len(docker["production"])} Docker Compose services."\n'
        f'  "REST API routes are organized across {api["endpoint_module_count"]} endpoint modules, '
        f'totaling {api["total_routes"]} routes."'
    )


if __name__ == "__main__":
    main()
