@echo off
rem Doble clic: genera los diagramas (Mermaid, DrawDecisionTree, Graphviz e
rem imagen SVG) a partir de recursos\posturas-creencias.md.
rem Si falta Graphviz lo instala solo; puede pedir permiso de administrador.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\convertir-posturas-creencias.ps1" -Interactive
