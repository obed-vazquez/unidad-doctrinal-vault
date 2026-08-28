@echo off
rem Doble clic: genera los diagramas (Mermaid, DrawDecisionTree, Graphviz e
rem imagen SVG) y los datos del visor interactivo
rem (arbol-web\datos\posturas-creencias.json) a partir de
rem recursos\posturas-creencias.md.
rem El visor se abre con doble clic en arbol-web\index.html.
rem Si falta Graphviz lo instala solo; puede pedir permiso de administrador.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\..\scripts\convertir-posturas-creencias.ps1" -Interactive
