"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/app/api/auth/auth.js"; // Убедитесь, что путь корректный

export default function SignIn() {
  const [formData, setFormData] = useState({
    phoneNumber: "",
    password: "",
  });
  const [error, setError] = useState(null);

  const router = useRouter();

  function formatPhoneNumber(value) {
    const digits = value.replace(/\D/g, "").substring(0, 10);
    let formatted = "";
    if (digits.length > 0) formatted = "(" + digits.substring(0, 3);
    if (digits.length >= 4) formatted += ") " + digits.substring(3, 6);
    if (digits.length >= 7) formatted += "-" + digits.substring(6, 8);
    if (digits.length >= 9) formatted += "-" + digits.substring(8, 10);
    return formatted;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "phoneNumber" ? formatPhoneNumber(value) : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const { phoneNumber, password } = formData;

    if (!phoneNumber || !password) {
      setError("Все поля должны быть заполнены");
      return;
    }
    console.log(phoneNumber)

    try {
      const response = await signIn(phoneNumber, password);
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token)
        router.push("/dashboard");
      } else {
        setError("Неверный номер телефона или пароль");
      }
    } catch (err) {
      setError("Произошла ошибка, попробуйте еще раз");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Войти в аккаунт</h1>
          <p className="mt-2 text-sm text-gray-600">Введите свои данные</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  type="tel"
                  placeholder="(XXX) XXX-XX-XX"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                type="password"
                className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                required
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Войти
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Не зарегистрированы?{" "}
            <Link href="/sign-up" className="font-medium text-gray-900 hover:underline">
              Создать аккаунт
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
