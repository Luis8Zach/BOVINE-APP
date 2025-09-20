import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReporteSemanal {
  fechaInicio: string;
  fechaFin: string;
  eventos: any[];
  estadisticas: {
    total: number;
    realizados: number;
    pendientes: number;
    atrasados: number;
    cumplimiento: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor(private databaseService: DatabaseService) {}

  // Generar reporte semanal
  async generarReporteSemanal(fechaInicio: string, fechaFin: string): Promise<ReporteSemanal> {
    try {
      const eventos = await this.databaseService.getAllEventos();
      
      // Filtrar eventos del rango semanal
      const eventosSemana = eventos.filter(evento => 
        evento.fecha >= fechaInicio && evento.fecha <= fechaFin
      );

      // Calcular estadísticas
      const total = eventosSemana.length;
      const realizados = eventosSemana.filter(e => e.estado === 'Realizado').length;
      const pendientes = eventosSemana.filter(e => e.estado === 'Pendiente' || e.estado === 'Programado').length;
      const atrasados = eventosSemana.filter(e => 
        this.esEventoAtrasado(e) && e.estado !== 'Realizado'
      ).length;
      
      const cumplimiento = total > 0 ? (realizados / total) * 100 : 0;

      return {
        fechaInicio,
        fechaFin,
        eventos: eventosSemana,
        estadisticas: {
          total,
          realizados,
          pendientes,
          atrasados,
          cumplimiento: Math.round(cumplimiento)
        }
      };
    } catch (error) {
      console.error('Error generando reporte:', error);
      throw error;
    }
  }

  // Verificar si un evento está atrasado
  private esEventoAtrasado(evento: any): boolean {
    const hoy = new Date().toISOString().split('T')[0];
    return evento.fecha < hoy && evento.estado !== 'Realizado';
  }

  // Generar PDF del reporte
  async generarPDF(reporte: ReporteSemanal): Promise<void> {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('REPORTE SEMANAL DE EVENTOS', 105, 15, { align: 'center' });
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${this.formatFecha(reporte.fechaInicio)} - ${this.formatFecha(reporte.fechaFin)}`, 14, 25);
    
    // Estadísticas
    doc.setFontSize(14);
    doc.text('ESTADÍSTICAS', 14, 40);
    
    doc.setFontSize(10);
    doc.text(`Total de eventos: ${reporte.estadisticas.total}`, 14, 50);
    doc.text(`Realizados: ${reporte.estadisticas.realizados}`, 14, 57);
    doc.text(`Pendientes: ${reporte.estadisticas.pendientes}`, 14, 64);
    doc.text(`Atrasados: ${reporte.estadisticas.atrasados}`, 14, 71);
    doc.text(`Cumplimiento: ${reporte.estadisticas.cumplimiento}%`, 14, 78);
    
    // Tabla de eventos
    const tableData = reporte.eventos.map(evento => [
      this.formatFecha(evento.fecha),
      evento.animalNombre,
      evento.tipo,
      evento.estado,
      this.obtenerEstadoCumplimiento(evento),
      evento.notas || '-'
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Fecha', 'Animal', 'Tipo', 'Estado', 'Cumplimiento', 'Notas']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    // Guardar PDF
    const fileName = `Reporte_Semanal_${reporte.fechaInicio}_${reporte.fechaFin}.pdf`;
    doc.save(fileName);
  }

  

  // Generar Excel del reporte
  async generarExcel(reporte: ReporteSemanal): Promise<void> {
    // Preparar datos
    const datos = reporte.eventos.map(evento => ({
      'Fecha': this.formatFecha(evento.fecha),
      'Animal': evento.animalNombre,
      'ID Animal': evento.animalId,
      'Tipo Evento': evento.tipo,
      'Estado': evento.estado,
      'Cumplimiento': this.obtenerEstadoCumplimiento(evento),
      'Notas': evento.notas || '',
      'Fecha Programada': evento.fecha,
      'Realizado a Tiempo': this.esRealizadoATiempo(evento) ? 'Sí' : 'No'
    }));

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);

    // Añadir hoja de estadísticas
    const statsData = [
      ['ESTADÍSTICAS SEMANALES', ''],
      ['Período', `${reporte.fechaInicio} - ${reporte.fechaFin}`],
      ['Total Eventos', reporte.estadisticas.total],
      ['Realizados', reporte.estadisticas.realizados],
      ['Pendientes', reporte.estadisticas.pendientes],
      ['Atrasados', reporte.estadisticas.atrasados],
      ['Cumplimiento', `${reporte.estadisticas.cumplimiento}%`]
    ];

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);

    // Añadir hojas al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Eventos');
    XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');

    // Guardar archivo
    const fileName = `Reporte_Semanal_${reporte.fechaInicio}_${reporte.fechaFin}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // Helper methods
  private formatFecha(fecha: string): string {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES');
  }

  private obtenerEstadoCumplimiento(evento: any): string {
    if (evento.estado === 'Realizado') {
      return 'Cumplido';
    } else if (this.esEventoAtrasado(evento)) {
      return 'Atrasado';
    } else {
      return 'Pendiente';
    }
  }

  private esRealizadoATiempo(evento: any): boolean {
    if (evento.estado !== 'Realizado') return false;
    
    // Verificar si se realizó después de la fecha programada
    const fechaRealizacion = evento.fechaActualizacion || evento.fechaCreacion;
    return fechaRealizacion <= evento.fecha;
  }

  // Obtener rango de la semana actual
  getSemanaActual(): { inicio: string; fin: string } {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - hoy.getDay()); // Domingo de esta semana
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6); // Sábado de esta semana

    return {
      inicio: inicio.toISOString().split('T')[0],
      fin: fin.toISOString().split('T')[0]
    };
  }

  // Obtener rango de la semana pasada
  getSemanaPasada(): { inicio: string; fin: string } {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - hoy.getDay() - 7); // Domingo semana pasada
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6); // Sábado semana pasada

    return {
      inicio: inicio.toISOString().split('T')[0],
      fin: fin.toISOString().split('T')[0]
    };

  }

  
}