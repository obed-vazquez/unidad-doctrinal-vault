@echo off
rem Doble clic: genera Mermaid, DrawDecisionTree, Graphviz, imagen SVG y los
rem datos del visor interactivo (arbol-web\datos\posturas-creencias.json) a
rem partir de recursos\posturas-creencias.md.
rem El visor se abre con doble clic en recursos\diagramas\arbol-web\index.html.
rem Si falta Graphviz lo instala solo; puede pedir permiso de administrador.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0convertir-posturas-creencias.ps1" -Diagramas -Interactive
