using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using ProjectGraham.Api.Data;

namespace ProjectGrahamBackendAPI
{
    public class Program
    {
        // POPRAWKA 1: Zmieniono "void" na "async Task", aby obsłużyć "await" przy tworzeniu bazy
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // 1. Konfiguracja kontrolerów i serializacji JSON (camelCase zgodny z TypeScript)
            builder.Services
                .AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });

            // 2. Konfiguracja bazy danych (SQLite domyślnie lub PostgreSQL przez ConnectionStrings)
            var databaseProvider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? "Sqlite";
            var sqliteConnectionString = builder.Configuration.GetConnectionString("SqliteConnection")
                ?? "Data Source=project_graham_hub.db";
            var postgresConnectionString = builder.Configuration.GetConnectionString("PostgresConnection");

            builder.Services.AddDbContext<AppDbContext>(options =>
            {
                if (string.Equals(databaseProvider, "PostgreSQL", StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(postgresConnectionString))
                {
                    options.UseNpgsql(postgresConnectionString);
                }
                else
                {
                    options.UseSqlite(sqliteConnectionString);
                }
            });

            // 3. Konfiguracja CORS dla frontendu React
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("ReactFrontendPolicy", policy =>
                {
                    policy
                        .WithOrigins(
                            "http://localhost:3000",
                            "http://127.0.0.1:3000",
                            "http://localhost:5173",
                            "http://127.0.0.1:5173"
                        )
                        .SetIsOriginAllowed(_ => true)
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });

            // 4. Konfiguracja Swagger / OpenAPI
            // POPRAWKA 2: Usunięto odwołanie do konfliktującego Microsoft.OpenApi.Models.OpenApiInfo
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // 5. Automatyczna inicjalizacja bazy i Seed Data przy starcie
            using (var scope = app.Services.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await dbContext.Database.EnsureCreatedAsync();
            }

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(options =>
                {
                    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Projekt Graham API v1");
                    options.RoutePrefix = "swagger";
                });
            }

            app.UseCors("ReactFrontendPolicy");
            app.UseAuthorization();
            app.MapControllers();

            await app.RunAsync("http://localhost:5000");
        }
    }
}