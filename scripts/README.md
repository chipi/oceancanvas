# scripts/

Developer automation scripts for OceanCanvas.

## setup.sh

**Run first after cloning.** Sets up the complete dev environment:

```bash
bash scripts/setup.sh
```

Checks prerequisites (Python 3.12, Node 20, Docker, uv), installs all
dependencies, creates local config, downloads GEBCO data, and validates
the installation. After it completes, `make up` starts the full stack.

See the script header for details on what each step does.
