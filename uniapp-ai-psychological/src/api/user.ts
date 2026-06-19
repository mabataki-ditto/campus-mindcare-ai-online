import http from "@/utils/request";
export function login(data: any) {
  return http.post("/user/login", data);
}
export function register(data: any) {
  return http.post("/user/add", data);
}
export function logout() {
  return http.post("/user/logout");
}
