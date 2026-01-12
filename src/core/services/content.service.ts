import {
  HttpBackend,
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiEndPoint } from '../../enums/api-end-point';
import { environment } from '../../environments/environment';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private noAuthHttp: HttpClient;

  constructor(private http: HttpClient, private handler: HttpBackend) {
    this.noAuthHttp = new HttpClient(handler);
  }

  // Admin Api Function

  getUser(data: any) {
    return this.http.get<any>(
      environment.apiUrl +
        ApiEndPoint.getUser +
        '?page=' +
        data.page +
        '&limit=' +
        data.limit
    );
  }

  deleteUser(id: any) {
    const path = ApiEndPoint.deleteUser.replace('{id}', id);
    return this.http.delete<any>(environment.apiUrl + path);
  }

  userDetail(id: any) {
    const path = ApiEndPoint.userDetail.replace('{id}', id);
    return this.http.get<any>(environment.apiUrl + path);
  }

  rolesPermission() {
    return this.http.get<any>(environment.apiUrl + ApiEndPoint.rolesPermission);
  }

  userStatus(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.userStatus,
      data
    );
  }

  deleteRole(id: any) {
    return this.http.delete<any>(
      environment.apiUrl + ApiEndPoint.deleteRole + '?id=' + id
    );
  }

  updateRole(id: any, payload: any) {
    const path = ApiEndPoint.updateRole.replace('{id}', id);
    return this.http.post<any>(environment.apiUrl + path, payload);
  }

  getRoleList(data?: any) {
    return this.http.get<any>(
      environment.apiUrl +
        ApiEndPoint.getRoleList +
        '?page=' +
        data.page +
        '&limit=' +
        data.limit
    );
  }

  getSectionList(data: any) {
    return this.http.get<any>(
      environment.apiUrl +
        ApiEndPoint.getSectionList +
        '?page=' +
        data.page +
        '&limit=' +
        data.limit
    );
  }

  getMatrix(params?: any) {
    const endpoint = `${environment.apiUrl}admin/getMatrix`;
    return this.http.get(endpoint, { params });
  }

  setTaskAction(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.setTaskAction,
      data
    );
  }

  addUpdateRole(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.addRoleAddUpdate,
      data
    );
  }

  getPermissionList(data: any) {
    return this.http.get<any>(
      environment.apiUrl +
        ApiEndPoint.getPermissionList +
        '?page=' +
        data.page +
        '&limit=' +
        data.limit
    );
  }

  deletePermission(id: any) {
    return this.http.delete<any>(
      environment.apiUrl + ApiEndPoint.deletePermission + '?id=' + id
    );
  }

  addUpdatePermission(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.addupdatePermission,
      data
    );
  }

  deleteSection(id: any) {
    return this.http.delete<any>(
      environment.apiUrl + ApiEndPoint.deleteSection + '?id=' + id
    );
  }

  // Screener //

  leadList(params: any) {
    return this.http.get<any>(environment.apiUrl + ApiEndPoint.leadList, {
      params,
    });
  }

  getProductList() {
    return this.http.get<any>(environment.apiUrl + ApiEndPoint.getProduct);
  }

  deleteProduct(id: any) {
    return this.http.delete<any>(
      environment.apiUrl + ApiEndPoint.deleteProduct + '?id=' + id
    );
  }

  addUpdateProuct(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.addUpdateProduct,
      data
    );
  }

  getRuleSet() {
    return this.http.get<any>(environment.apiUrl + ApiEndPoint.getRuleSet);
  }

  addUpdateRuleSet(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.addupdateRuleSet,
      data
    );
  }

  deleteRuleSet(id: any) {
    return this.http.delete<any>(
      environment.apiUrl + ApiEndPoint.deleteRuleSet + '?id=' + id
    );
  }

  getFoirRule() {
    return this.http.get<any>(environment.apiUrl + ApiEndPoint.getFoirRule);
  }

  addupdateFoirRule(data: any) {
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.addupdateFoirRule,
      data
    );
  }

  deleteFoirRule(id: any) {
    return this.http.delete<any>(
      environment.apiUrl + ApiEndPoint.deleteFoirRule + '?id=' + id
    );
  }

  // use for multiple logins

  getCaseDetail(leadId: string) {
    return this.http.get<any>(
      environment.apiUrl + ApiEndPoint.adminLeadDetail + '?leadId=' + leadId
    );
  }

   // use for multiple logins 
  lockUnlockLead(payload: any) {  
    return this.http.post<any>(
      environment.apiUrl + ApiEndPoint.lockUnlocklead,
      payload
    );
  }

  leadStatus(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint,data)
  }


  // Admin Personal Detail Save functions 

  personalSaveBasic(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.personalSaveBasic,data)
  }


  personalSaveAddress(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.personalSaveAddress,data)
  }

  personalSaveEmployment(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.personalSaveEmployment,data)
  }

  personalSaveRefrences(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.personalSaveRefrences,data)
  }


  // for all Profile 

  getProfile(userId:any){
return this.http.get<any>(environment.apiUrl + ApiEndPoint.profile + '?userId=' + userId)
  }

  createUpload(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.createUpload,data)
  }

  completeUpload(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.completeUpload,data)
  }

  companyUpdate(data:any){
    return this.http.post<any>(environment.apiUrl + ApiEndPoint.companyUpdate,data)
  }

stateByPin(pincode: string | number) {
  return this.http.get<any>(
    `${environment.apiUrl}public/pincodes/${pincode}/resolve`
  );
}

menuRole(){

  return this.http.get<any>(environment.apiUrl + ApiEndPoint.menuRole + '?sortBy=sortOrder')
}

uploadLink(data:any){
  return this.http.post<any>(environment.apiUrl + ApiEndPoint.uploadLink,data)

}

  leadCheckView(leadRef:any){
    return this.http.get<any>(environment.apiUrl +ApiEndPoint.leadcheckView + '?leadRef=' + leadRef)
  }


  leadpullBereau(data:any){
return this.http.post<any>(environment.apiUrl + ApiEndPoint.pullBureau,data)
  }

checkViewSection(payload: { leadRef: string; key: string }) {
  return this.http.get<any>(
    `${environment.apiUrl}${ApiEndPoint.checkViewSection}`,
    { params: payload }
  );
}

runInternalDepude(data:any){
  return this.http.post<any>(environment.apiUrl + ApiEndPoint.runInternalDepude,data)
}

loanApplication(data: any) {
  return this.http.get<any>(
    environment.apiUrl +
      ApiEndPoint.loanApplication +
      `?page=${data.page}` +
      `&pageSize=${data.pageSize}` +
      `&ownership=TEAM_ALL` +
      `&status=${data.status}`
  );
}


applicationLockUnlock(data:any){
 return this.http.post<any>(environment.apiUrl + ApiEndPoint.applicationLockUnlock,data)
}


}
