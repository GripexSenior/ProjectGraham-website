FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["ProjectGrahamBackendAPI.csproj", "./"]
RUN dotnet restore "ProjectGrahamBackendAPI.csproj"
COPY . .
RUN dotnet publish "ProjectGrahamBackendAPI.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5000
ENTRYPOINT ["dotnet", "ProjectGrahamBackendAPI.dll"]