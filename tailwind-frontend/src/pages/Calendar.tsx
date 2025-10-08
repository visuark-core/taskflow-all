import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tasks } from '../data/mockData';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => {
    const dateFormat = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    });

    return (
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <button
              className="p-2 hover:bg-gray-100 rounded-md dark:hover:bg-gray-800"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-medium mx-2">
              {dateFormat.format(currentMonth)}
            </h2>
            <button
              className="p-2 hover:bg-gray-100 rounded-md dark:hover:bg-gray-800"
              onClick={nextMonth}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button className="btn btn-outline">Today</button>
          <div className="flex rounded-md border border-gray-300 dark:border-gray-700">
            <button className="px-3 py-1 bg-primary-500 text-white text-sm">Month</button>
            <button className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Week</button>
            <button className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Day</button>
          </div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    
    const startDate = new Date(currentMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="py-2 text-center font-medium text-gray-500 dark:text-gray-400" key={i}>
          {dateFormat.format(new Date(startDate))}
        </div>
      );
      startDate.setDate(startDate.getDate() + 1);
    }
    
    return <div className="grid grid-cols-7 border-b dark:border-gray-700">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = day.getDate().toString();
        const cloneDay = new Date(day);
        const dayEvents = tasks.filter(task => {
          const taskDate = new Date(task.dueDate);
          return (
            taskDate.getDate() === cloneDay.getDate() &&
            taskDate.getMonth() === cloneDay.getMonth() &&
            taskDate.getFullYear() === cloneDay.getFullYear()
          );
        });

        days.push(
          <div
            className={`min-h-[120px] p-2 border dark:border-gray-700 ${
              day.getMonth() !== currentMonth.getMonth()
                ? "bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500"
                : ""
            }`}
            key={day.toString()}
          >
            <div className="flex justify-between">
              <span
                className={`text-sm font-medium ${
                  isToday(day)
                    ? "h-6 w-6 rounded-full bg-primary-500 text-white flex items-center justify-center"
                    : ""
                }`}
              >
                {formattedDate}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {dayEvents.map((event, index) => (
                <div
                  key={index}
                  className={`text-xs rounded px-2 py-1 truncate ${
                    event.priority === "High" || event.priority === "Critical"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : event.priority === "Medium"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        );
        day = new Date(day);
        day.setDate(day.getDate() + 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="mt-2">{rows}</div>;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const isToday = (day: Date) => {
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      {renderHeader()}
      <div className="card overflow-hidden">
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}