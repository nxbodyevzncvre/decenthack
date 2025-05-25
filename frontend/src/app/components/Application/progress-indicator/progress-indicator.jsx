export default function ProgressIndicator({ currentStep }) {
  const steps = [
    { number: 1, title: "Информация о полёте" },
    { number: 2, title: "Проверка опасных зон" },
    { number: 3, title: "Подтверждение" },
  ]

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="w-full">
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= step.number ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.number}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 flex-1 ${currentStep >= step.number + 1 ? "bg-gray-900" : "bg-gray-200"}`}></div>
              )}
            </div>
            <div className="mt-2 text-xs font-medium text-gray-600">{step.title}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
