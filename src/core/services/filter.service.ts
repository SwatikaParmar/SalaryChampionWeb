import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private filterParams: any = {};

  setFilterParams(params: any): void {
    this.filterParams = params;
  }

  getFilterParams(): any {
    return this.filterParams;
  }

  clearFilteredData(): void {
    this.filterParams = [];
  }
}