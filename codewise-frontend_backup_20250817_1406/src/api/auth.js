// src/api/auth.js
export const loginUser = async (credentials) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const fakeToken = 'header.payload.signature';
      localStorage.setItem('token', fakeToken);
      resolve({
        name: '테스트사용자',
        email: credentials?.email ?? 'test@example.com',
      });
    }, 300);
  });
};

export const logoutUser = () => {
  localStorage.removeItem('token');
};
