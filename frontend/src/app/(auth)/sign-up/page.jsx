"use client";

import Link from "next/link";
import { useState } from "react";
import { signUp } from "@/app/api/auth/auth.js";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const router = useRouter();

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, "").substring(0, 10);
    let formatted = "";
    if (digits.length > 0) formatted = "(" + digits.substring(0, 3);
    if (digits.length >= 4) formatted += ") " + digits.substring(3, 6);
    if (digits.length >= 7) formatted += "-" + digits.substring(6, 8);
    if (digits.length >= 9) formatted += "-" + digits.substring(8, 10);
    return formatted;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "phoneNumber" ? formatPhoneNumber(value) : value,
    });
  };

  const validateForm = () => {
    const { firstName, lastName, middleName, phoneNumber, password, confirmPassword } = formData;
    if (!firstName || !lastName || !middleName || !phoneNumber || !password || !confirmPassword) {
      return "Все поля должны быть заполнены.";
    }
    if (password !== confirmPassword) {
      return "Пароли должны совпадать.";
    }
    if (!/^\(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phoneNumber)) {
      return "Номер телефона должен быть в формате (XXX) XXX-XX-XX.";
    }
    return "";
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const { firstName, lastName, middleName, phoneNumber, password } = formData;
      const response = await signUp(lastName, firstName, middleName, phoneNumber, password);

      if (response.data?.access_token) {
        localStorage.setItem("token", response.data.access_token)
        router.push("/dashboard");
      } else {
        setError("Ошибка регистрации. Попробуйте снова.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Неизвестная ошибка.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Создание аккаунта</h1>
          <p className="mt-2 text-sm text-gray-600">Создайте аккаунт для управления дронами</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {[
              { label: "Фамилия", name: "lastName", type: "text" },
              { label: "Имя", name: "firstName", type: "text" },
              { label: "Отчество", name: "middleName", type: "text" },
            ].map(({ label, name, type }) => (
              <div key={name}>
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  value={formData[name]}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                />
              </div>
            ))}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Номер телефона
              </label>
              <div className="flex mt-1">
                <div className="flex items-center justify-center w-16 h-10 text-sm text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
                  +7
                </div>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="(XXX) XXX-XX-XX"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                />
              </div>
            </div>
            {[
              { label: "Пароль", name: "password", type: "password" },
              { label: "Подтвердите пароль", name: "confirmPassword", type: "password" },
            ].map(({ label, name, type }) => (
              <div key={name}>
                <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  value={formData[name]}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                />
              </div>
            ))}
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Зарегистрироваться
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Уже есть аккаунт?{" "}
            <Link href="/sign-in" className="font-medium text-gray-900 hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
